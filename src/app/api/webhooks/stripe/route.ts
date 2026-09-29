import { NextRequest, NextResponse } from 'next/server';
import { db } from '@backend/store/db';
import { stripeEnabled } from '@backend/config';
import { verifyWebhook } from '@backend/payments/stripe';
import { markOrderPaid, markOrderProcessing, cancelOrder, UNPAID_STATUSES } from '@backend/lib/commerce';

/*
 * Stripe → server payment confirmations. This is the only place an online order
 * becomes "paid"; the browser's return to the success page proves nothing.
 * Configure the endpoint in Stripe with these events:
 *   checkout.session.completed, checkout.session.async_payment_succeeded,
 *   checkout.session.async_payment_failed, checkout.session.expired
 */
export async function POST(req: NextRequest) {
  if (!stripeEnabled()) return NextResponse.json({ error: 'Not found.' }, { status: 404 });

  const raw = await req.text();
  let event: any;
  try {
    event = verifyWebhook(raw, req.headers.get('stripe-signature'), process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err) {
    console.warn('[stripe webhook] rejected:', (err as Error).message);
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 400 });
  }

  try {
    db.transaction((tx) => {
      // Stripe retries deliveries; handle each event once.
      const seen = tx.get('webhook_events');
      if (seen.some((e) => e.id === event.id)) return;
      tx.set('webhook_events', [{ id: event.id, at: new Date().toISOString() }, ...seen].slice(0, 5000));

      const session = event.data?.object ?? {};
      const orders = tx.get('orders');
      const order = orders.find(
        (o) => o.id === session.metadata?.orderId || (session.client_reference_id && o.reference === session.client_reference_id)
      );
      if (!order) {
        console.warn('[stripe webhook] no order for event', event.id, event.type);
        return;
      }

      order.payment = {
        ...(order.payment || {}),
        provider: 'stripe',
        sessionId: session.id ?? order.payment?.sessionId,
        paymentIntentId: session.payment_intent ?? order.payment?.paymentIntentId ?? null,
        paymentStatus: session.payment_status ?? order.payment?.paymentStatus,
      };

      switch (event.type) {
        case 'checkout.session.completed':
          if (session.payment_status === 'paid' || session.payment_status === 'no_payment_required') {
            markOrderPaid(tx, order, 'stripe');
          } else {
            markOrderProcessing(tx, order, 'stripe'); // e.g. bank transfer started, funds not yet arrived
          }
          break;
        case 'checkout.session.async_payment_succeeded':
          markOrderPaid(tx, order, 'stripe');
          break;
        case 'checkout.session.async_payment_failed':
          if (UNPAID_STATUSES.includes(order.status)) cancelOrder(tx, order, 'stripe', 'Payment failed.');
          break;
        case 'checkout.session.expired':
          if (order.status === 'pending_payment') cancelOrder(tx, order, 'stripe', 'Payment page expired.', 'expired');
          break;
        default:
          break;
      }
      tx.set('orders', orders);
    });
  } catch (err) {
    // A 500 makes Stripe retry later.
    console.error('[stripe webhook] processing failed:', err);
    return NextResponse.json({ error: 'Processing failed.' }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

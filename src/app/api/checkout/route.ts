import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { getSessionUser } from '@backend/auth/session';
import { placeCheckout, cancelOrder, toCustomerOrder, toCustomerMemo } from '@backend/lib/commerce';
import { createCheckoutSession } from '@backend/payments/stripe';
import { WIRE_BANK_DETAILS } from '@backend/config';
import { handle, ok, readJson, assertSameOrigin, clientIp, siteOrigin, HttpError } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';
import * as v from '@backend/lib/validate';
import { parseCart } from './shared';

/**
 * Places an order (bank wire or online payment) or a memo request. The server
 * prices the cart, reserves the stones and — for online payment — hands back the
 * payment provider's hosted page. Stones are only marked sold once payment is
 * confirmed (by the provider's webhook or by an admin for wires).
 */
export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  rateLimit(`checkout:ip:${clientIp(req)}`, 10, 10 * 60_000);
  const body = await readJson(req);

  const { stoneIds, shippingMethod, promoCode } = parseCart(body);
  const paymentMethod = v.oneOf(body.paymentMethod, 'Payment method', ['wire', 'card', 'memo'] as const);
  const c = body.contact || {};
  const contact = {
    companyName: v.str(c.companyName, 'Company name', { required: true, max: 160 }),
    clientName: v.str(c.clientName, 'Contact name', { required: true, max: 120 }),
    email: v.email(c.email),
    phone: v.str(c.phone, 'Phone', { max: 40 }),
    address: v.str(c.address, 'Delivery address', { required: paymentMethod !== 'memo', max: 300 }),
    city: v.str(c.city, 'City', { max: 120 }),
    country: v.str(c.country, 'Country', { required: paymentMethod !== 'memo', max: 80 }),
  };
  const notes = v.str(body.notes, 'Notes', { max: 1000 });

  const user = await getSessionUser();
  const result = placeCheckout({ stoneIds, shippingMethod, promoCode, paymentMethod, notes, contact }, user);

  if (result.kind === 'memo') {
    return ok({ kind: 'memo', memos: result.memos.map(toCustomerMemo) }, 201);
  }

  const order = result.order;
  const orderLink = `/?order=${encodeURIComponent(order.reference)}&t=${encodeURIComponent(order.accessToken)}`;

  if (order.paymentMethod === 'card') {
    try {
      const session = await createCheckoutSession(order, siteOrigin(req));
      db.transaction((tx) => {
        const orders = tx.get('orders');
        const record = orders.find((o) => o.id === order.id);
        if (record) record.payment = { provider: 'stripe', sessionId: session.id };
        tx.set('orders', orders);
      });
      return ok({ kind: 'redirect', url: session.url, order: toCustomerOrder(order), orderLink }, 201);
    } catch (err) {
      console.error('[checkout] could not start online payment:', err);
      db.transaction((tx) => {
        const orders = tx.get('orders');
        const record = orders.find((o) => o.id === order.id);
        if (record) cancelOrder(tx, record, 'system', 'Online payment could not be started.');
        tx.set('orders', orders);
      });
      throw new HttpError(502, 'Online payment could not be started. Please try again, or choose bank wire.');
    }
  }

  return ok(
    {
      kind: 'order',
      order: toCustomerOrder(order),
      orderLink,
      wireInstructions: WIRE_BANK_DETAILS() || null,
    },
    201
  );
});

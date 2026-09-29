import crypto from 'crypto';
import type { OrderRecord } from '../store/db';
import { HOLD } from '../config';
import { safeEqual } from '../lib/ids';

/*
 * Stripe Checkout adapter (hosted payment page, so card details never reach this
 * server). Active only when STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET are set.
 * Another gateway (e.g. PayChangu or DPO Pay) would implement the same two steps:
 * create a hosted payment session, then confirm payment from a signed webhook.
 */

const apiBase = () => (process.env.STRIPE_API_BASE || 'https://api.stripe.com').replace(/\/$/, '');

/** Stripe expects nested form fields: line_items[0][price_data][currency]=usd */
function formEncode(value: unknown, prefix = '', out = new URLSearchParams()): URLSearchParams {
  if (value === undefined || value === null) return out;
  if (Array.isArray(value)) {
    value.forEach((v, i) => formEncode(v, `${prefix}[${i}]`, out));
  } else if (typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) formEncode(v, prefix ? `${prefix}[${k}]` : k, out);
  } else {
    out.append(prefix, String(value));
  }
  return out;
}

async function stripeRequest(path: string, params: Record<string, unknown>, idempotencyKey?: string) {
  const res = await fetch(`${apiBase()}${path}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
    },
    body: formEncode(params),
  });
  const data: any = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || `Stripe request failed (${res.status})`);
  return data;
}

export async function createCheckoutSession(order: OrderRecord, origin: string): Promise<{ id: string; url: string }> {
  // The session must close before the stone's hold lapses. Stripe requires at least 30 minutes.
  const sessionMinutes = Math.max(30, HOLD.cardMinutes() - 10);
  const orderLink = `order=${encodeURIComponent(order.reference)}&t=${encodeURIComponent(order.accessToken)}`;
  const description = order.items.map((i) => i.name).join('; ').slice(0, 300);

  const session = await stripeRequest(
    '/v1/checkout/sessions',
    {
      mode: 'payment',
      client_reference_id: order.reference,
      customer_email: order.contact.email,
      success_url: `${origin}/?checkout=success&${orderLink}`,
      cancel_url: `${origin}/?checkout=cancelled&${orderLink}`,
      expires_at: Math.floor(Date.now() / 1000) + sessionMinutes * 60,
      // One line for the exact server-computed total (stones, delivery, tax and any discount).
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: 'usd',
            unit_amount: Math.round(order.totalUSD * 100),
            product_data: { name: `YosenaMora order ${order.reference}`, description },
          },
        },
      ],
      metadata: { orderId: order.id, reference: order.reference },
      payment_intent_data: { metadata: { orderId: order.id, reference: order.reference } },
    },
    `checkout-${order.id}`
  );
  return { id: session.id, url: session.url };
}

/** Closes an open session so an abandoned or cancelled order can no longer be paid. */
export async function expireCheckoutSession(sessionId: string): Promise<void> {
  try {
    await stripeRequest(`/v1/checkout/sessions/${encodeURIComponent(sessionId)}/expire`, {});
  } catch (err) {
    console.warn('[stripe] could not expire session', sessionId, (err as Error).message);
  }
}

/**
 * Verifies the Stripe-Signature header (t=timestamp,v1=hmac) against the raw body,
 * as documented by Stripe, and returns the parsed event. Throws if invalid or stale.
 */
export function verifyWebhook(rawBody: string, header: string | null, secret: string, toleranceSeconds = 300): any {
  if (!header) throw new Error('Missing Stripe-Signature header.');
  let timestamp = '';
  const signatures: string[] = [];
  for (const part of header.split(',')) {
    const [key, value] = part.split('=');
    if (key === 't') timestamp = value;
    if (key === 'v1' && value) signatures.push(value);
  }
  if (!timestamp || signatures.length === 0) throw new Error('Malformed Stripe-Signature header.');

  const expected = crypto.createHmac('sha256', secret).update(`${timestamp}.${rawBody}`, 'utf8').digest('hex');
  if (!signatures.some((sig) => safeEqual(sig, expected))) throw new Error('Signature mismatch.');

  const age = Math.abs(Math.floor(Date.now() / 1000) - Number(timestamp));
  if (!Number.isFinite(age) || age > toleranceSeconds) throw new Error('Signature timestamp outside tolerance.');

  return JSON.parse(rawBody);
}

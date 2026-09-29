import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { cancelOrder, toCustomerOrder } from '@backend/lib/commerce';
import { expireCheckoutSession } from '@backend/payments/stripe';
import { handle, ok, readJson, assertSameOrigin, clientIp, HttpError } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';
import { safeEqual } from '@backend/lib/ids';

/** Called when a buyer leaves the payment page: releases the stones straight away. */
export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  rateLimit(`cancel:ip:${clientIp(req)}`, 20, 10 * 60_000);
  const body = await readJson(req, 4_000);
  const reference = typeof body.reference === 'string' ? body.reference : '';
  const token = typeof body.t === 'string' ? body.t : '';

  const { order, sessionId } = db.transaction((tx) => {
    const orders = tx.get('orders');
    const record = orders.find((o) => o.reference === reference);
    if (!record || !record.accessToken || !safeEqual(record.accessToken, token)) throw new HttpError(404, 'Order not found.');
    if (record.status !== 'pending_payment') return { order: record, sessionId: null as string | null };
    cancelOrder(tx, record, 'customer', 'Buyer left the payment page.');
    tx.set('orders', orders);
    return { order: record, sessionId: record.payment?.sessionId ?? null };
  });

  if (sessionId) await expireCheckoutSession(sessionId);
  return ok({ order: toCustomerOrder(order) });
});

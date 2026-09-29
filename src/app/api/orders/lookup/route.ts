import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { releaseExpiredHolds, toCustomerOrder } from '@backend/lib/commerce';
import { handle, ok, clientIp, HttpError } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';
import { safeEqual } from '@backend/lib/ids';

/** Order status for whoever holds the private order link (reference + token), e.g. a guest buyer. */
export const GET = handle(async (req: NextRequest) => {
  rateLimit(`lookup:ip:${clientIp(req)}`, 60, 10 * 60_000);
  const params = new URL(req.url).searchParams;
  const reference = params.get('ref') || '';
  const token = params.get('t') || '';

  const order = db.transaction((tx) => {
    releaseExpiredHolds(tx);
    return tx.get('orders').find((o) => o.reference === reference);
  });
  if (!order || !order.accessToken || !safeEqual(order.accessToken, token)) throw new HttpError(404, 'Order not found.');
  return ok({ order: toCustomerOrder(order) });
});

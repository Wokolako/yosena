import { db } from '@backend/store/db';
import { requireUser } from '@backend/auth/session';
import { toCustomerOrder } from '@backend/lib/commerce';
import { handle, ok } from '@backend/lib/http';

/** A signed-in member's own orders. Admins use /api/admin/orders. */
export const GET = handle(async () => {
  const me = await requireUser();
  const orders = db.all('orders').filter((o) => o.userId === me.id).map(toCustomerOrder);
  return ok({ count: orders.length, data: orders });
});

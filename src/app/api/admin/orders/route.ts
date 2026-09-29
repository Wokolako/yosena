import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { releaseExpiredHolds } from '@backend/lib/commerce';
import { adminOrderView } from '@backend/lib/adminInput';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireAdmin();
  const orders = db.transaction((tx) => {
    releaseExpiredHolds(tx);
    return tx.get('orders');
  });
  return ok({ data: orders.map(adminOrderView) });
});

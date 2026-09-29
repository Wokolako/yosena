import { db } from '@backend/store/db';
import { requireUser } from '@backend/auth/session';
import { toCustomerMemo } from '@backend/lib/commerce';
import { handle, ok } from '@backend/lib/http';

/**
 * A signed-in member's own memos. New memo requests are placed through checkout
 * (payment option "Inspection memo"); admins manage all memos at /api/admin/memos.
 */
export const GET = handle(async () => {
  const me = await requireUser();
  const memos = db.all('memos').filter((m) => m.userId === me.id).map(toCustomerMemo);
  return ok({ count: memos.length, data: memos });
});

import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { releaseExpiredHolds, toCustomerMemo, openMemoExposure } from '@backend/lib/commerce';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireAdmin();
  const data = db.transaction((tx) => {
    releaseExpiredHolds(tx);
    const users = tx.get('users');
    return tx.get('memos').map((m) => {
      const member = users.find((u) => u.id === m.userId);
      return {
        ...m,
        ...toCustomerMemo(m),
        history: m.history ?? [],
        adminNotes: m.adminNotes ?? '',
        member: member
          ? {
              email: member.email,
              clientName: member.clientName,
              creditLineUSD: member.creditLineUSD,
              openExposureUSD: openMemoExposure(tx, member.id),
            }
          : null,
      };
    });
  });
  return ok({ data });
});

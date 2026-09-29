import { db } from '@backend/store/db';
import { requireAdmin, toPublicUser } from '@backend/auth/session';
import { openMemoExposure } from '@backend/lib/commerce';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireAdmin();
  const data = db.transaction((tx) =>
    tx.get('users').map((u) => ({
      ...toPublicUser(u),
      lastLoginAt: u.lastLoginAt ?? null,
      openMemoExposureUSD: openMemoExposure(tx, u.id),
    }))
  );
  return ok({ data });
});

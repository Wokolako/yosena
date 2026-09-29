import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

/** Journal articles (including drafts), consultation services and policies. */
export const GET = handle(async () => {
  await requireAdmin();
  return ok({ data: db.doc('content') });
});

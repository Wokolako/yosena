import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireAdmin();
  return ok({ data: db.all('quotes') });
});

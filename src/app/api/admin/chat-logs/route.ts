import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireAdmin();
  const logs = db.all('chat_logs');
  return ok({ count: logs.length, data: logs });
});

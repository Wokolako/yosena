import type { Tx, UserRecord } from '../store/db';
import { newId } from './ids';

const MAX_ENTRIES = 5000;

/** Records an admin action inside the same transaction as the change itself. */
export function audit(tx: Tx, actor: UserRecord, action: string, target: string, details?: Record<string, unknown>) {
  const entries = tx.get('audit');
  entries.unshift({
    id: newId('aud'),
    at: new Date().toISOString(),
    actorId: actor.id,
    actorEmail: actor.email,
    action,
    target,
    details,
  });
  tx.set('audit', entries.slice(0, MAX_ENTRIES));
}

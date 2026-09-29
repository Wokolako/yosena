import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { approveMemo, closeMemo, releaseExpiredHolds, toCustomerMemo } from '@backend/lib/commerce';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';
import * as v from '@backend/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

const ACTIONS = ['approve', 'reject', 'mark_returned', 'mark_sold', 'note'] as const;

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson(req);
  const action = v.oneOf(body.action, 'Action', ACTIONS);
  const note = v.str(body.note, 'Note', { max: 1000 });

  const memo = db.transaction((tx) => {
    releaseExpiredHolds(tx);
    const memos = tx.get('memos');
    const memo = memos.find((m) => m.id === id);
    if (!memo) throw new HttpError(404, 'Memo not found.');

    switch (action) {
      case 'approve':
        approveMemo(
          tx,
          memo,
          v.str(body.courier, 'Courier', { required: true, max: 120 }),
          v.str(body.tracking, 'Tracking number', { max: 120 }),
          admin.email
        );
        break;
      case 'reject':
        closeMemo(tx, memo, 'Rejected', admin.email, note);
        break;
      case 'mark_returned':
        closeMemo(tx, memo, 'Returned', admin.email, note);
        break;
      case 'mark_sold':
        closeMemo(tx, memo, 'Sold', admin.email, note);
        break;
      case 'note':
        memo.adminNotes = v.str(body.adminNotes, 'Notes', { max: 4000 });
        memo.updatedAt = new Date().toISOString();
        break;
    }
    tx.set('memos', memos);
    audit(tx, admin, `memo.${action}`, memo.id, note ? { note } : undefined);
    return memo;
  });

  return ok({ message: 'Memo updated.', data: { ...memo, ...toCustomerMemo(memo) } });
});

import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';
import * as v from '@backend/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

const QUOTE_STATUSES = ['New', 'Replied', 'Converted', 'Closed'] as const;

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson(req);
  const status = body.status !== undefined ? v.oneOf(body.status, 'Status', QUOTE_STATUSES) : undefined;
  const adminReply = body.adminReply !== undefined ? v.str(body.adminReply, 'Reply notes', { max: 4000 }) : undefined;

  const quote = db.transaction((tx) => {
    const quotes = tx.get('quotes');
    const quote = quotes.find((q) => q.id === id);
    if (!quote) throw new HttpError(404, 'Quote request not found.');
    if (status !== undefined) quote.status = status;
    if (adminReply !== undefined) quote.adminReply = adminReply;
    quote.updatedAt = new Date().toISOString();
    tx.set('quotes', quotes);
    audit(tx, admin, 'quote.update', quote.id, { status });
    return quote;
  });

  return ok({ message: 'Quote updated.', data: quote });
});

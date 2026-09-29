import { NextRequest } from 'next/server';
import { db, Tx, StoneRecord } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { UNPAID_STATUSES } from '@backend/lib/commerce';
import { parseStone, withPricePerCarat } from '@backend/lib/adminInput';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';

type Ctx = { params: Promise<{ id: string }> };

/** The order or memo currently holding a stone, if that hold is still live. */
function activeHolder(tx: Tx, stone: StoneRecord): string | null {
  if (!stone.reservedFor) return null;
  const order = tx.get('orders').find((o) => o.id === stone.reservedFor);
  if (order && (UNPAID_STATUSES.includes(order.status) || (stone.status === 'Sold' && ['paid', 'shipped', 'completed'].includes(order.status)))) {
    return `order ${order.reference}`;
  }
  const memo = tx.get('memos').find((m) => m.id === stone.reservedFor);
  if (memo && ['Requested', 'On Memo', 'Sold'].includes(memo.status)) return `memo ${memo.id}`;
  return null;
}

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { id } = await params;
  const fields = parseStone(await readJson(req), true);

  const stone = db.transaction((tx) => {
    const stones = tx.get('gemstones');
    const stone = stones.find((s) => s.id === id);
    if (!stone) throw new HttpError(404, 'Stone not found.');

    if (fields.status !== undefined && fields.status !== stone.status) {
      const holder = activeHolder(tx, stone);
      if (holder) {
        throw new HttpError(409, `This stone is held by ${holder}. Change it from the Orders or Memos tab so both records stay in step.`);
      }
      // A manual change clears any stale hold; "Reserved" by hand means held for the desk until changed.
      stone.reservedFor = fields.status === 'Reserved' ? 'manual' : fields.status === 'Sold' ? stone.reservedFor : null;
      stone.reservedUntil = null;
    }
    if (fields.archived && activeHolder(tx, stone) && stone.status !== 'Sold') {
      throw new HttpError(409, 'This stone is held by an open order or memo and cannot be archived yet.');
    }

    const before = { priceUSD: stone.priceUSD, status: stone.status, archived: !!stone.archived };
    Object.assign(stone, fields, { updatedAt: new Date().toISOString() });
    withPricePerCarat(stone);
    tx.set('gemstones', stones);
    audit(tx, admin, 'stone.update', stone.id, { changed: Object.keys(fields), before });
    return stone;
  });

  return ok({ message: 'Saved. The storefront shows the change now.', data: stone });
});

/** Archiving hides a stone from the storefront but keeps its history. */
export const DELETE = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { id } = await params;

  db.transaction((tx) => {
    const stones = tx.get('gemstones');
    const stone = stones.find((s) => s.id === id);
    if (!stone) throw new HttpError(404, 'Stone not found.');
    if (activeHolder(tx, stone) && stone.status !== 'Sold') {
      throw new HttpError(409, 'This stone is held by an open order or memo and cannot be archived yet.');
    }
    stone.archived = true;
    stone.updatedAt = new Date().toISOString();
    tx.set('gemstones', stones);
    audit(tx, admin, 'stone.archive', stone.id, { name: stone.name });
  });

  return ok({ message: 'Stone archived. It no longer appears in the catalog.' });
});

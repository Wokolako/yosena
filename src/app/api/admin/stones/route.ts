import { NextRequest } from 'next/server';
import { db, StoneRecord } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { releaseExpiredHolds } from '@backend/lib/commerce';
import { parseStone, newStoneId, withPricePerCarat } from '@backend/lib/adminInput';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

/** All stones, including archived ones and hold details. */
export const GET = handle(async () => {
  await requireAdmin();
  const stones = db.transaction((tx) => {
    releaseExpiredHolds(tx);
    return tx.get('gemstones');
  });
  return ok({ data: stones });
});

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const fields = parseStone(await readJson(req), false);
  if (fields.status && fields.status !== 'In Vault' && fields.status !== 'Sold') {
    throw new HttpError(400, 'New stones start In Vault (or Sold, for records). Reserve or memo them through orders and memos.');
  }

  const stone = db.transaction((tx) => {
    const stones = tx.get('gemstones');
    const record = withPricePerCarat({
      ...(fields as StoneRecord),
      id: newStoneId(fields.category!),
      status: fields.status ?? 'In Vault',
      featured: !!fields.featured,
      archived: false,
      reservedFor: null,
      reservedUntil: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    stones.unshift(record);
    tx.set('gemstones', stones);
    audit(tx, admin, 'stone.create', record.id, { name: record.name, priceUSD: record.priceUSD });
    return record;
  });

  return ok({ message: 'Stone added. It is live in the catalog now.', data: stone }, 201);
});

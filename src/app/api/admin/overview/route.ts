import { db } from '@backend/store/db';
import { requireAdmin, accountStatus } from '@backend/auth/session';
import { releaseExpiredHolds, UNPAID_STATUSES } from '@backend/lib/commerce';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireAdmin();
  db.transaction((tx) => releaseExpiredHolds(tx));

  const stones = db.all('gemstones').filter((s) => !s.archived);
  const orders = db.all('orders');
  const memos = db.all('memos');
  const bookings = db.all('bookings');
  const quotes = db.all('quotes');
  const users = db.all('users');
  const logs = db.all('chat_logs');

  return ok({
    data: {
      stonesListed: stones.length,
      vaultValueUSD: stones.filter((s) => s.status !== 'Sold').reduce((sum, s) => sum + s.priceUSD, 0),
      stonesByStatus: ['In Vault', 'Reserved', 'On Memo', 'Sold'].map((status) => ({
        status,
        count: stones.filter((s) => s.status === status).length,
      })),
      ordersAwaitingPayment: orders.filter((o) => UNPAID_STATUSES.includes(o.status)).length,
      ordersToShip: orders.filter((o) => o.status === 'paid').length,
      ordersNeedingAttention: orders.filter((o) => o.attention).length,
      memoRequests: memos.filter((m) => m.status === 'Requested').length,
      memosOut: memos.filter((m) => m.status === 'On Memo').length,
      bookingsPending: bookings.filter((b) => b.status === 'Pending Review').length,
      quotesNew: quotes.filter((q) => q.status === 'New' || q.status === 'Trade Desk Underwriting').length,
      accountsPending: users.filter((u) => accountStatus(u) === 'pending').length,
      conciergeHandoffs: logs.filter((l) => l.handoff).length,
    },
  });
});

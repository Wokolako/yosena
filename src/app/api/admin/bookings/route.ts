import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';
import * as v from '@backend/lib/validate';

export const dynamic = 'force-dynamic';

export const GET = handle(async () => {
  await requireAdmin();
  return ok({ data: db.all('bookings'), settings: db.doc('settings') });
});

/** Opening hours for the public booking calendar. */
export const PUT = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const body = await readJson(req);

  const bookingTimes = v.stringArray(body.bookingTimes, 'Time slots', { max: 24, maxLength: 40 });
  if (bookingTimes.length === 0) throw new HttpError(400, 'Keep at least one time slot.');
  const closedDates = v.stringArray(body.closedDates ?? [], 'Closed dates', { max: 366, maxLength: 10 });
  for (const d of closedDates) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) throw new HttpError(400, `"${d}" is not a date in YYYY-MM-DD form.`);
  }
  const bookingWindowDays = v.num(body.bookingWindowDays ?? 14, 'Booking window', { min: 1, max: 120, integer: true });

  const settings = db.transaction((tx) => {
    const next = { ...tx.getDoc('settings'), bookingTimes, closedDates: Array.from(new Set(closedDates)).sort(), bookingWindowDays };
    tx.setDoc('settings', next);
    audit(tx, admin, 'bookings.settings', 'settings', { bookingTimes, closedDates: next.closedDates, bookingWindowDays });
    return next;
  });
  return ok({ message: 'Calendar updated. The booking page shows it now.', settings });
});

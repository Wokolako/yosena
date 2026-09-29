import { db } from '@backend/store/db';
import { calendar } from '@backend/lib/bookings';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

/** Open dates and times only — never who booked them. */
export const GET = handle(async () => {
  const settings = db.doc('settings');
  return ok({ timezone: 'UK time', dates: calendar(settings, db.all('bookings')) });
});

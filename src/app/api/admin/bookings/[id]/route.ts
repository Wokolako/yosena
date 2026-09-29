import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';
import * as v from '@backend/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

const ACTIONS = ['confirm', 'cancel', 'complete', 'reschedule', 'note'] as const;

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson(req);
  const action = v.oneOf(body.action, 'Action', ACTIONS);

  const booking = db.transaction((tx) => {
    const bookings = tx.get('bookings');
    const booking = bookings.find((b) => b.id === id);
    if (!booking) throw new HttpError(404, 'Booking not found.');

    switch (action) {
      case 'confirm':
        booking.status = 'Confirmed';
        break;
      case 'cancel':
        booking.status = 'Cancelled';
        break;
      case 'complete':
        booking.status = 'Completed';
        break;
      case 'reschedule': {
        const date = v.str(body.date, 'Date', { required: true, max: 10 });
        const time = v.str(body.time, 'Time', { required: true, max: 40 });
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new HttpError(400, 'Use a date in YYYY-MM-DD form.');
        const clash = bookings.find((b) => b.id !== booking.id && b.date === date && b.time === time && b.status !== 'Cancelled');
        if (clash) throw new HttpError(409, `That slot is already taken by ${clash.referenceNumber}.`);
        booking.date = date;
        booking.time = time;
        booking.status = 'Confirmed';
        break;
      }
      case 'note':
        booking.adminNotes = v.str(body.adminNotes, 'Notes', { max: 4000 });
        break;
    }
    booking.updatedAt = new Date().toISOString();
    tx.set('bookings', bookings);
    audit(tx, admin, `booking.${action}`, booking.referenceNumber);
    return booking;
  });

  return ok({ message: 'Booking updated.', data: booking });
});

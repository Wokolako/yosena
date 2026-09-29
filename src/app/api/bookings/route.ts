import { NextRequest } from 'next/server';
import { db, BookingRecord } from '@backend/store/db';
import { getSessionUser } from '@backend/auth/session';
import { bookableDates } from '@backend/lib/bookings';
import { handle, ok, readJson, assertSameOrigin, clientIp, HttpError } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';
import { newId, newReference } from '@backend/lib/ids';
import * as v from '@backend/lib/validate';

/**
 * Appointment requests. They arrive as "Pending Review" and the trade desk confirms
 * them in the admin area. Listing bookings is admin-only (/api/admin/bookings).
 */
export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  rateLimit(`booking:ip:${clientIp(req)}`, 8, 60 * 60_000);
  const body = await readJson(req, 16_000);

  const serviceId = v.str(body.serviceId, 'Service', { required: true, max: 80 });
  const date = v.str(body.date, 'Date', { required: true, max: 10 });
  const time = v.str(body.time, 'Time', { required: true, max: 40 });
  const clientName = v.str(body.clientName, 'Contact name', { required: true, max: 120 });
  const companyName = v.str(body.companyName, 'Company name', { max: 160 });
  const email = v.email(body.email);
  const phone = v.str(body.phone, 'Phone', { max: 40 });
  const specificInquiry = v.str(body.specificInquiry, 'Inquiry', { max: 2000 });

  const user = await getSessionUser();
  const service = db.doc('content').services.find((s) => s.id === serviceId);
  if (!service) throw new HttpError(400, 'Choose a consultation service.');

  const booking = db.transaction((tx) => {
    const settings = tx.getDoc('settings');
    if (!bookableDates(settings).includes(date)) throw new HttpError(400, 'That date is not available. Please choose another.');
    if (!settings.bookingTimes.includes(time)) throw new HttpError(400, 'That time is not available. Please choose another.');
    const bookings = tx.get('bookings');
    if (bookings.some((b) => b.date === date && b.time === time && b.status !== 'Cancelled')) {
      throw new HttpError(409, 'That slot has just been taken. Please choose another time.');
    }
    const record: BookingRecord = {
      id: newId('bk'),
      serviceId: service.id,
      serviceTitle: service.title,
      date,
      time,
      clientName,
      companyName: companyName || 'Independent Atelier',
      email,
      phone,
      specificInquiry,
      status: 'Pending Review',
      referenceNumber: newReference('BK'),
      userId: user?.id ?? null,
      createdAt: new Date().toISOString(),
    };
    tx.set('bookings', [record, ...bookings]);
    return record;
  });

  return ok(
    {
      message: 'Appointment request received. The trade desk will confirm it by email.',
      data: {
        referenceNumber: booking.referenceNumber,
        serviceTitle: booking.serviceTitle,
        date: booking.date,
        time: booking.time,
        clientName: booking.clientName,
        companyName: booking.companyName,
        email: booking.email,
        status: booking.status,
      },
    },
    201
  );
});

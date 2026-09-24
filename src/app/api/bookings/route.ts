import { NextRequest, NextResponse } from 'next/server';
import { db, BookingData } from '../../../../backend/data/db';
import { requireAdmin } from '../../../lib/requireAdmin';

/**
 * The appointment book: every client's name, company, email, phone and the
 * inquiry they wrote. Desk-only. Booking itself (POST, below) stays open to
 * visitors, which is why the gate sits on the handler rather than in proxy.ts
 * — the middleware matcher cannot tell the two methods apart.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const bookings = email ? await db.getBookingsByEmail(email) : await db.getBookings();

    return NextResponse.json({ success: true, count: bookings.length, data: bookings });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve bookings.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { serviceId, serviceTitle, date, time, clientName, companyName, email, phone, specificInquiry } = body;

    if (!serviceTitle || !date || !time || !clientName || !email) {
      return NextResponse.json(
        { success: false, error: 'Service title, appointment date, time, client name, and email are required.' },
        { status: 400 }
      );
    }

    const referenceNumber = `SA-VAULT-${Math.floor(1000 + Math.random() * 9000)}`;
    const newBooking: BookingData = {
      id: `BK-${Date.now()}`,
      serviceId: serviceId || 'vault-consultation',
      serviceTitle: serviceTitle.trim(),
      date: date.trim(),
      time: time.trim(),
      clientName: clientName.trim(),
      companyName: (companyName || 'Private Collector / Atelier').trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      specificInquiry: (specificInquiry || '').trim(),
      status: 'Confirmed',
      referenceNumber,
      createdAt: new Date().toISOString()
    };

    const saved = await db.createBooking(newBooking);

    return NextResponse.json(
      {
        success: true,
        message: 'Consultation appointment scheduled and confirmed.',
        data: saved
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to create booking.', details: err?.message },
      { status: 500 }
    );
  }
}

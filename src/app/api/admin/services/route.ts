import { NextRequest, NextResponse } from 'next/server';
import { db, ServiceData } from '../../../../../backend/data/db';
import { requireAdmin } from '../../../../lib/requireAdmin';

const FORMATS = ['Virtual', 'In-Person Vault', 'Atelier Visit'];

function buildService(body: any, id: string): { errors: string[]; service?: ServiceData } {
  const errors: string[] = [];

  const title = String(body?.title ?? '').trim();
  const type = String(body?.type ?? '');

  if (!title) errors.push('Title is required.');
  if (!FORMATS.includes(type)) errors.push(`Format must be one of: ${FORMATS.join(', ')}.`);

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    service: {
      id,
      title,
      duration: String(body.duration ?? '').trim() || '60 minutes',
      type: type as ServiceData['type'],
      fee: String(body.fee ?? '').trim() || 'Complimentary',
      description: String(body.description ?? '').trim(),
      suitableFor: String(body.suitableFor ?? '').trim(),
      sortOrder: Number(body.sortOrder ?? 0),
      isActive: body.isActive === undefined ? true : Boolean(body.isActive),
    },
  };
}

/** Every tier, including ones withdrawn from public booking. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const services = await db.getServices();
    return NextResponse.json({ success: true, count: services.length, data: services });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load services.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const body = await req.json();
    const id = String(body?.id ?? '').trim() || `srv-${Date.now()}`;

    const { errors, service } = buildService(body, id);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(' ') }, { status: 400 });
    }

    const saved = await db.upsertService(service!);
    return NextResponse.json(
      { success: true, message: 'Consultation tier saved.', data: saved },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to save consultation tier.', details: err?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const id = new URL(req.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'A service id is required.' },
        { status: 400 }
      );
    }

    const deleted = await db.deleteService(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Consultation tier '${id}' not found.` },
        { status: 404 }
      );
    }

    // Past bookings keep their own service_title, so the booking history is
    // unaffected by this. Deactivating instead of deleting keeps the link.
    return NextResponse.json({ success: true, message: 'Consultation tier removed.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to remove consultation tier.', details: err?.message },
      { status: 500 }
    );
  }
}

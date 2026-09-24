import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../backend/data/db';
import { requireAdmin } from '../../../../lib/requireAdmin';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const stone = await db.getGemstoneById(id);

    if (!stone) {
      return NextResponse.json(
        { success: false, error: `Gemstone '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: stone });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve gemstone.' },
      { status: 500 }
    );
  }
}

const VALID_STATUSES = ['In Vault', 'On Memo', 'Reserved'] as const;
type StoneStatus = (typeof VALID_STATUSES)[number];

/**
 * Inventory status changes from the trade desk. Administrators only.
 *
 * This used to accept any staff account, but every self-serve signup lands as
 * a trade partner, so that let anyone with a Clerk account move stock between
 * the floor and consignment. Status is inventory truth shown on the public
 * catalog, so it belongs to the desk alone.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const gate = await requireAdmin();
    if (gate.response) return gate.response;

    const { id } = await params;
    const body = await req.json();
    const status = body?.status as StoneStatus;

    if (!VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: `Status must be one of: ${VALID_STATUSES.join(', ')}.` },
        { status: 400 }
      );
    }

    const updated = await db.updateGemstoneStatus(id, status);

    if (!updated) {
      return NextResponse.json(
        { success: false, error: `Gemstone '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to update gemstone status.' },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../../../backend/data/db';
import { requireAdmin } from '../../../../../lib/requireAdmin';
import { deleteReplacedUpload } from '../../../../../../backend/data/uploads';
import { buildStone } from '../route';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

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
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load stone.' },
      { status: 500 }
    );
  }
}

/**
 * Edit a stone. The body may be partial: it is merged over the stored record
 * before validation, so the desk can change a price without resending the
 * whole dossier.
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const { id } = await params;
    const current = await db.getGemstoneById(id);

    if (!current) {
      return NextResponse.json(
        { success: false, error: `Gemstone '${id}' not found.` },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { errors, stone } = buildStone({ ...current, ...body }, id);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(' ') }, { status: 400 });
    }

    const updated = await db.updateGemstone(id, stone!);

    // Done after the write, so a failed update never destroys the image the
    // stone is still using.
    await deleteReplacedUpload(current.image, updated?.image);

    return NextResponse.json({
      success: true,
      message: 'Stone updated.',
      data: updated,
    });
  } catch (err: any) {
    if (err?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'That certificate number is already recorded against another stone.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to update stone.', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * Remove a stone. Refused when a memo or order references it — those records
 * must keep pointing at something real. Set the status to delist instead.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const { id } = await params;
    const current = await db.getGemstoneById(id);

    if (!current) {
      return NextResponse.json(
        { success: false, error: `Gemstone '${id}' not found.` },
        { status: 404 }
      );
    }

    const { deleted, blockedBy } = await db.deleteGemstone(id);

    if (!deleted) {
      return NextResponse.json(
        {
          success: false,
          error: `This stone is referenced by ${blockedBy} and cannot be deleted. Change its status to delist it instead.`,
        },
        { status: 409 }
      );
    }

    // The stone is gone, so its photograph has nothing left to belong to.
    await deleteReplacedUpload(current.image, null);

    return NextResponse.json({ success: true, message: `Stone ${id} removed from inventory.` });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to delete stone.', details: err?.message },
      { status: 500 }
    );
  }
}

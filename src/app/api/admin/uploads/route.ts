import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '../../../../lib/requireAdmin';
import {
  storeUpload,
  deleteUpload,
  deleteUnreferencedUploads,
  uploadIdFromUrl,
  ACCEPTED_TYPES,
  MAX_UPLOAD_BYTES,
} from '../../../../../backend/data/uploads';

/**
 * Receives a stone photograph from the trade desk and returns the URL to store
 * on the gemstone record.
 *
 * Admin-only, like every /api/admin route. The file is validated by signature
 * rather than by what the browser calls it, and the stored filename is
 * generated server-side, so nothing the client sends reaches the filesystem.
 */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const form = await req.formData();
    const file = form.get('file');

    if (!file || typeof file === 'string') {
      return NextResponse.json(
        { success: false, error: 'No file was attached.' },
        { status: 400 }
      );
    }

    // Read the size before buffering so an oversized upload is refused without
    // being held in memory in full.
    if (file.size > MAX_UPLOAD_BYTES) {
      const mb = (file.size / 1024 / 1024).toFixed(1);
      return NextResponse.json(
        { success: false, error: `That image is ${mb} MB. The limit is 8 MB.` },
        { status: 413 }
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const result = await storeUpload(bytes, file.type);

    if ('error' in result) {
      return NextResponse.json({ success: false, error: result.error }, { status: 400 });
    }

    return NextResponse.json(
      { success: true, message: 'Image uploaded.', data: result },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'The image could not be stored.', details: err?.message },
      { status: 500 }
    );
  }
}

/**
 * Lets the admin form describe its own limits rather than hardcoding them, and
 * sweeps images abandoned by a form that was never saved.
 */
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  const swept = await deleteUnreferencedUploads();

  return NextResponse.json({
    success: true,
    data: { acceptedTypes: ACCEPTED_TYPES, maxBytes: MAX_UPLOAD_BYTES, swept },
  });
}

/**
 * Removes a stored image.
 *
 * Called by the editor when the desk replaces or clears a photograph before
 * saving, so an image discarded mid-edit does not linger. Accepts either the
 * bare id or the URL held on the record.
 */
export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const param = new URL(req.url).searchParams.get('id');

    if (!param) {
      return NextResponse.json(
        { success: false, error: 'An image id is required.' },
        { status: 400 }
      );
    }

    const id = uploadIdFromUrl(param) ?? param;
    const deleted = await deleteUpload(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: 'That image is not in the store.' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Image removed.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'The image could not be removed.', details: err?.message },
      { status: 500 }
    );
  }
}

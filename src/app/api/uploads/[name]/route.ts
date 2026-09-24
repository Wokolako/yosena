import { NextRequest, NextResponse } from 'next/server';
import { readUpload } from '../../../../../backend/data/uploads';

/**
 * Serves a stored stone photograph.
 *
 * Public, because these images appear in the catalog that anyone can browse.
 * readUpload only accepts the exact generated-name shape, so a request cannot
 * reach anything outside the upload directory.
 *
 * Filenames are content-addressed by random id and never reused, so a given URL
 * always returns the same bytes and can be cached indefinitely.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  const file = await readUpload(name);

  if (!file) {
    return NextResponse.json({ success: false, error: 'Image not found.' }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(file.bytes), {
    status: 200,
    headers: {
      'Content-Type': file.contentType,
      'Content-Length': String(file.bytes.length),
      'Cache-Control': 'public, max-age=31536000, immutable',
    },
  });
}

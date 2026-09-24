import crypto from 'crypto';
import { query, queryOne } from './pool';

/**
 * Stone photography, stored as base64 text in the `uploads` table.
 *
 * Keeping the bytes in the database rather than on disk means they survive a
 * deploy, are covered by the same backup as the catalog, and can never be
 * orphaned by a file left behind when a record changes — deleting the row is
 * the whole cleanup.
 *
 * Images are served back through /api/uploads/<id>, which decodes the base64
 * to binary and sets a real image content type, so browsers cache them
 * normally. The gemstone record only ever holds that URL string, which is why
 * stones pointing at an external host keep working unchanged.
 */

/** 8 MB of actual image. base64 inflates this by about a third in storage. */
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * Accepted formats, and the leading bytes each one must actually start with.
 * The browser-supplied MIME type is a claim, not evidence — checking the
 * signature stops a file that merely calls itself an image from being stored
 * and later served back to visitors.
 */
const ACCEPTED: Record<string, { ext: string; matches: (b: Buffer) => boolean }> = {
  'image/jpeg': {
    ext: 'jpg',
    matches: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  'image/png': {
    ext: 'png',
    matches: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
  },
  'image/webp': {
    ext: 'webp',
    matches: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  'image/avif': {
    ext: 'avif',
    matches: (b) => b.subarray(4, 8).toString('ascii') === 'ftyp',
  },
};

export const ACCEPTED_TYPES = Object.keys(ACCEPTED);

/**
 * Ids are generated here and never taken from the client, so a stored id is
 * always exactly this shape. The read path re-checks it, which is what makes a
 * crafted id structurally unable to address anything else.
 */
const STORED_ID = /^[0-9a-f]{32}\.(jpg|png|webp|avif)$/;

export interface StoredUpload {
  id: string;
  url: string;
  bytes: number;
  contentType: string;
}

export interface UploadRejection {
  error: string;
}

export async function storeUpload(
  bytes: Buffer,
  declaredType: string
): Promise<StoredUpload | UploadRejection> {
  const spec = ACCEPTED[declaredType];

  if (!spec) {
    return { error: `Unsupported image type. Use one of: ${ACCEPTED_TYPES.join(', ')}.` };
  }

  if (bytes.length === 0) {
    return { error: 'That file is empty.' };
  }

  if (bytes.length > MAX_UPLOAD_BYTES) {
    const mb = (bytes.length / 1024 / 1024).toFixed(1);
    return { error: `That image is ${mb} MB. The limit is 8 MB.` };
  }

  if (!spec.matches(bytes.subarray(0, 16))) {
    return { error: `That file is not a valid ${spec.ext.toUpperCase()} image.` };
  }

  const id = `${crypto.randomBytes(16).toString('hex')}.${spec.ext}`;

  await query(
    `INSERT INTO uploads (id, content_type, data_base64, byte_size)
     VALUES ($1, $2, $3, $4)`,
    [id, declaredType, bytes.toString('base64'), bytes.length]
  );

  return { id, url: `/api/uploads/${id}`, bytes: bytes.length, contentType: declaredType };
}

export interface ReadUpload {
  bytes: Buffer;
  contentType: string;
}

/** Returns null for anything that is not a stored image, including bad ids. */
export async function readUpload(id: string): Promise<ReadUpload | null> {
  if (!STORED_ID.test(id)) return null;

  const row = await queryOne<{ content_type: string; data_base64: string }>(
    'SELECT content_type, data_base64 FROM uploads WHERE id = $1',
    [id]
  );

  if (!row) return null;

  return {
    bytes: Buffer.from(row.data_base64, 'base64'),
    contentType: row.content_type,
  };
}

/** True when a gemstone's image URL points at this store, not an external host. */
export const isStoredUploadUrl = (url: string): boolean =>
  /^\/api\/uploads\/[0-9a-f]{32}\.(jpg|png|webp|avif)$/.test(String(url ?? ''));

/** The id inside one of our URLs, or null if it is an external image. */
export const uploadIdFromUrl = (url: string): string | null =>
  isStoredUploadUrl(url) ? String(url).replace('/api/uploads/', '') : null;

export async function deleteUpload(id: string): Promise<boolean> {
  if (!STORED_ID.test(id)) return false;
  const rows = await query('DELETE FROM uploads WHERE id = $1 RETURNING id', [id]);
  return rows.length > 0;
}

/**
 * Deletes the image a record used to point at, when it is one of ours and the
 * record now points somewhere else.
 *
 * Called whenever a stone's photograph is replaced or the stone is removed, so
 * a replaced image is gone rather than lingering unreferenced. A no-op when the
 * old value was an external URL, when nothing changed, or when the same image
 * is still in use.
 */
export async function deleteReplacedUpload(
  previousUrl: string | null | undefined,
  nextUrl: string | null | undefined
): Promise<void> {
  if (!previousUrl || previousUrl === nextUrl) return;

  const id = uploadIdFromUrl(previousUrl);
  if (!id) return;

  // Another stone may have been pointed at the same image; only remove it once
  // nothing references it any more.
  const [{ count }] = await query<{ count: string }>(
    'SELECT count(*)::text AS count FROM gemstones WHERE image = $1',
    [previousUrl]
  );

  if (Number(count) > 0) return;

  await deleteUpload(id);
}

/**
 * Removes stored images nothing points at.
 *
 * The desk can upload a photograph and then abandon the form without ever
 * saving the stone, which leaves an image with no owner. Those are swept here
 * rather than being left to accumulate.
 */
export async function deleteUnreferencedUploads(olderThanMinutes = 60): Promise<number> {
  const rows = await query<{ id: string }>(
    `DELETE FROM uploads u
      WHERE u.created_at < now() - ($1 || ' minutes')::interval
        AND NOT EXISTS (
          SELECT 1 FROM gemstones g WHERE g.image = '/api/uploads/' || u.id
        )
      RETURNING u.id`,
    [String(olderThanMinutes)]
  );
  return rows.length;
}

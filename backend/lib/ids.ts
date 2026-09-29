import crypto from 'crypto';

// No 0/O/1/I, so references read back cleanly over the phone.
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function randomCode(length: number): string {
  const bytes = crypto.randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return out;
}

/** Human-readable, unguessable reference, e.g. ORD-2026-7KQ2M9XH (32^8 ≈ 10^12 values). */
export const newReference = (prefix: string) => `${prefix}-${new Date().getFullYear()}-${randomCode(8)}`;

export const newId = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export const newSecret = () => crypto.randomBytes(24).toString('base64url');

export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ab.length === bb.length && crypto.timingSafeEqual(ab, bb);
}

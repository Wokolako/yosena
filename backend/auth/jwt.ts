import crypto from 'crypto';
import jwt from 'jsonwebtoken';

/*
 * Session tokens carry only the user id. Role and account status are always read
 * from the data store, so a demoted or disabled account loses access immediately.
 */

export interface SessionPayload {
  sub: string;
}

function secret(): string {
  const configured = process.env.JWT_SECRET;
  if (configured) {
    if (configured.length < 32) throw new Error('JWT_SECRET must be at least 32 characters long.');
    return configured;
  }
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET is not set. Refusing to sign or verify sessions without it.');
  }
  // Development only: a random per-process secret (sessions reset on restart). Never a fixed value.
  const g = globalThis as any;
  if (!g.__ymDevJwtSecret) {
    g.__ymDevJwtSecret = crypto.randomBytes(48).toString('hex');
    console.warn('[auth] JWT_SECRET is not set; using a temporary development secret. Set JWT_SECRET in .env.local.');
  }
  return g.__ymDevJwtSecret;
}

export function signSession(userId: string, ttlSeconds: number): string {
  return jwt.sign({ sub: userId } satisfies SessionPayload, secret(), {
    expiresIn: ttlSeconds,
    algorithm: 'HS256',
  });
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, secret(), { algorithms: ['HS256'] }) as SessionPayload;
    return typeof decoded?.sub === 'string' ? decoded : null;
  } catch {
    return null;
  }
}

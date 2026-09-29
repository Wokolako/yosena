import { NextRequest, NextResponse } from 'next/server';

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export const ok = (body: Record<string, unknown>, status = 200) =>
  NextResponse.json({ success: true, ...body }, { status, headers: { 'Cache-Control': 'no-store' } });

export const fail = (status: number, error: string, extra?: Record<string, unknown>) =>
  NextResponse.json({ success: false, error, ...extra }, { status, headers: { 'Cache-Control': 'no-store' } });

/** Wraps a route handler: HttpErrors become JSON responses; anything else is logged and hidden from the client. */
export function handle<A extends unknown[]>(fn: (...args: A) => Promise<Response>) {
  return async (...args: A): Promise<Response> => {
    try {
      return await fn(...args);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.status, err.message, err.extra);
      console.error('[api] unexpected error:', err);
      return fail(500, 'Something went wrong. Please try again.');
    }
  };
}

/** Reads a JSON body with a size cap. */
export async function readJson<T = any>(req: NextRequest, maxBytes = 64_000): Promise<T> {
  const text = await req.text();
  if (text.length > maxBytes) throw new HttpError(413, 'Request is too large.');
  try {
    const parsed = JSON.parse(text || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('not an object');
    return parsed as T;
  } catch {
    throw new HttpError(400, 'Malformed request.');
  }
}

/**
 * CSRF defence for cookie-authenticated requests: a browser always sends Origin on
 * cross-site POST/PUT/PATCH/DELETE, so reject any that do not come from this site.
 */
export function assertSameOrigin(req: NextRequest): void {
  const origin = req.headers.get('origin');
  if (!origin) return; // Non-browser clients (server-to-server) send no Origin.
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Cross-site request refused.');
  }
  if (!host || originHost !== host) throw new HttpError(403, 'Cross-site request refused.');
}

export function clientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0].trim();
  return req.headers.get('x-real-ip') || 'local';
}

/** The site's own origin, for redirect URLs (Stripe success/cancel). */
export function siteOrigin(req: NextRequest): string {
  if (process.env.APP_URL && /^https?:\/\//.test(process.env.APP_URL)) return process.env.APP_URL.replace(/\/$/, '');
  return new URL(req.url).origin;
}

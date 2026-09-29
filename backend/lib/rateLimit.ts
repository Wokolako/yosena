import { HttpError } from './http';

/*
 * Fixed-window rate limiter kept in process memory. It resets on restart and is
 * per-instance; move it to a shared store (e.g. Redis) when running several instances.
 */

type Bucket = { count: number; resetAt: number };
const store: Map<string, Bucket> =
  ((globalThis as any).__ymRateLimit ??= new Map<string, Bucket>());

export function rateLimit(key: string, limit: number, windowMs: number): void {
  const now = Date.now();
  const bucket = store.get(key);
  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    if (store.size > 10_000) {
      for (const [k, b] of store) if (b.resetAt <= now) store.delete(k);
    }
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
    throw new HttpError(429, 'Too many requests. Please wait a moment and try again.', { retryAfterSeconds: retryAfter });
  }
}

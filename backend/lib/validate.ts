import { HttpError } from './http';

/** Small field validators; each throws a 400 with a readable message. */

export function str(value: unknown, field: string, opts: { required?: boolean; max?: number } = {}): string {
  const { required = false, max = 500 } = opts;
  if (value === undefined || value === null || value === '') {
    if (required) throw new HttpError(400, `${field} is required.`);
    return '';
  }
  if (typeof value !== 'string' && typeof value !== 'number') throw new HttpError(400, `${field} must be text.`);
  const s = String(value).trim();
  if (required && !s) throw new HttpError(400, `${field} is required.`);
  if (s.length > max) throw new HttpError(400, `${field} must be at most ${max} characters.`);
  return s;
}

export function email(value: unknown, field = 'Email'): string {
  const s = str(value, field, { required: true, max: 254 }).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s)) throw new HttpError(400, 'Enter a valid email address.');
  return s;
}

export function num(value: unknown, field: string, opts: { min?: number; max?: number; integer?: boolean } = {}): number {
  const n = typeof value === 'string' && value.trim() !== '' ? Number(value) : (value as number);
  if (typeof n !== 'number' || !Number.isFinite(n)) throw new HttpError(400, `${field} must be a number.`);
  if (opts.integer && !Number.isInteger(n)) throw new HttpError(400, `${field} must be a whole number.`);
  if (opts.min !== undefined && n < opts.min) throw new HttpError(400, `${field} must be at least ${opts.min}.`);
  if (opts.max !== undefined && n > opts.max) throw new HttpError(400, `${field} must be at most ${opts.max}.`);
  return n;
}

export function oneOf<T extends string>(value: unknown, field: string, allowed: readonly T[]): T {
  if (typeof value !== 'string' || !allowed.includes(value as T)) {
    throw new HttpError(400, `${field} must be one of: ${allowed.join(', ')}.`);
  }
  return value as T;
}

export function stringArray(value: unknown, field: string, opts: { max?: number; maxLength?: number } = {}): string[] {
  const { max = 200, maxLength = 100 } = opts;
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be a list.`);
  if (value.length > max) throw new HttpError(400, `${field} has too many entries.`);
  return value.map((v, i) => str(v, `${field}[${i}]`, { required: true, max: maxLength }));
}

/** Only http(s) URLs may be stored for images, so a record can never carry a javascript: URL. */
export function url(value: unknown, field: string, required = false): string {
  const s = str(value, field, { required, max: 2000 });
  if (!s) return s;
  try {
    const u = new URL(s);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') throw new Error();
  } catch {
    throw new HttpError(400, `${field} must be a web address starting with https://`);
  }
  return s;
}

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72; // bcrypt ignores bytes beyond 72.

export function password(value: unknown): string {
  if (typeof value !== 'string') throw new HttpError(400, 'Password is required.');
  if (value.length < PASSWORD_MIN) throw new HttpError(400, `Use at least ${PASSWORD_MIN} characters for the password.`);
  if (Buffer.byteLength(value, 'utf8') > PASSWORD_MAX) throw new HttpError(400, `Use at most ${PASSWORD_MAX} characters for the password.`);
  return value;
}

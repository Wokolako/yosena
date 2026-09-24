import path from 'path';
import dotenv from 'dotenv';

/**
 * Loads environment files for the standalone Node entry points (the Express
 * server and the migration script).
 *
 * Next.js reads `.env.local` on its own, but plain `dotenv/config` only reads
 * `.env` — so scripts run outside Next would miss DATABASE_URL and the Clerk
 * keys. Files are loaded most-specific first; dotenv does not overwrite a
 * variable that is already set, so the real environment still wins over both.
 */
const ROOT = process.cwd();

for (const file of ['.env.local', '.env']) {
  dotenv.config({ path: path.join(ROOT, file) });
}

// @clerk/express reads CLERK_PUBLISHABLE_KEY, while Next needs the key exposed
// to the browser as NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY. They are the same value,
// so the Next-prefixed one stays the single source of truth and is mirrored
// here for the Express server rather than being duplicated in the env file.
if (!process.env.CLERK_PUBLISHABLE_KEY && process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
  process.env.CLERK_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
}

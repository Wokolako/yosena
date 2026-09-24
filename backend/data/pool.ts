import { Pool } from 'pg';
import type { PoolClient, QueryResultRow } from 'pg';

/**
 * PostgreSQL connection pool.
 *
 * Configured from DATABASE_URL (see .env.example). One pool is shared by the
 * Next route handlers and the standalone Express server.
 */

declare global {
  // eslint-disable-next-line no-var
  var __yosenamoraPool: Pool | undefined;
}

/**
 * Built on first use rather than at import time. `next build` imports every
 * route module to collect the route table, and a missing DATABASE_URL must fail
 * the request that needs it, not the build.
 */
function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env and point it at your PostgreSQL database.'
    );
  }

  const created = new Pool({
    connectionString,
    max: Number(process.env.PGPOOL_MAX ?? 10),
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 10_000,
    // Managed providers (Neon, Supabase, RDS) terminate plaintext connections.
    ssl: process.env.PGSSL === 'require' ? { rejectUnauthorized: false } : undefined,
  });

  // An idle client erroring (a dropped connection, a server restart) emits on
  // the pool. Without a listener Node treats it as an unhandled error and exits.
  created.on('error', (err) => {
    console.error('[DB] Idle client error:', err.message);
  });

  return created;
}

/**
 * In development Next reloads modules on every edit, so the pool is cached on
 * globalThis to stop each reload opening a fresh set of connections.
 */
export function getPool(): Pool {
  if (!globalThis.__yosenamoraPool) {
    globalThis.__yosenamoraPool = createPool();
  }
  return globalThis.__yosenamoraPool;
}

/** Runs a single query and returns its rows. */
export async function query<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T[]> {
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

/** Runs a query expected to match at most one row. */
export async function queryOne<T extends QueryResultRow>(
  text: string,
  params: unknown[] = []
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

/**
 * Runs `fn` inside a transaction, rolling back if it throws. Used where one
 * logical write spans two tables — an order and its line items, a memo and the
 * stone's status.
 */
export async function transaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Closes every pooled connection. Used by the migration script on exit. */
export async function closePool(): Promise<void> {
  if (globalThis.__yosenamoraPool) {
    await globalThis.__yosenamoraPool.end();
    globalThis.__yosenamoraPool = undefined;
  }
}

/**
 * Creates the schema and loads the seed JSON into PostgreSQL.
 *
 *   npm run db:migrate          apply schema.sql, then seed any empty table
 *   npm run db:migrate -- --reset   drop everything first, then recreate and seed
 *
 * Seeding is idempotent: rows are inserted with ON CONFLICT DO NOTHING, so
 * running it twice does not duplicate anything. The JSON files under
 * backend/data/ remain as the seed source; nothing reads them at runtime.
 */

import fs from 'fs';
import path from 'path';
import '../loadEnv';
import { closePool, query, transaction } from './pool';

const DATA_DIR = path.resolve(process.cwd(), 'backend', 'data');
const SCHEMA_PATH = path.resolve(process.cwd(), 'backend', 'schema.sql');

const readJson = <T>(filename: string): T[] => {
  const filePath = path.join(DATA_DIR, filename);
  if (!fs.existsSync(filePath)) {
    console.warn(`  ! ${filename} not found — skipping`);
    return [];
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
};

/** Everything schema.sql creates, dropped in dependency order. */
async function reset(): Promise<void> {
  console.log('• Dropping existing objects');
  await query(`
    DROP VIEW  IF EXISTS active_memos CASCADE;
    DROP TABLE IF EXISTS uploads, chat_logs, policy_sections, policies, blog_posts,
                         quote_requests, order_items, orders, memos, bookings,
                         consultation_services, saved_stones, gemstones, users CASCADE;
    DROP TYPE  IF EXISTS gem_category, gem_shape, gem_status, account_role,
                         booking_status, service_format, post_category CASCADE;
  `);
}

async function applySchema(): Promise<void> {
  if (!fs.existsSync(SCHEMA_PATH)) {
    throw new Error(`schema.sql not found at ${SCHEMA_PATH}`);
  }

  // schema.sql is plain CREATE statements, so applying it twice would error.
  // Seeding below is separately idempotent, which is what a re-run is for.
  const [{ exists }] = await query<{ exists: boolean }>(
    `SELECT to_regclass('public.users') IS NOT NULL AS exists`
  );

  if (exists) {
    console.log('• Schema already present — skipping (use --reset to rebuild)');
    return;
  }

  console.log('• Applying schema.sql');
  await query(fs.readFileSync(SCHEMA_PATH, 'utf-8'));
}

const isEmpty = async (table: string): Promise<boolean> => {
  const rows = await query<{ n: string }>(`SELECT count(*)::text AS n FROM ${table}`);
  return rows[0].n === '0';
};

/** ISO timestamp or 'YYYY-MM-DD' from the JSON; null when absent. */
const asDate = (value: unknown): string | null => {
  if (!value) return null;
  const str = String(value);
  return str.split('T')[0];
};

async function seed(): Promise<void> {
  await transaction(async (client) => {
    /* users ---------------------------------------------------------- */
    if (await isEmpty('users')) {
      const users = readJson<any>('users.json');
      for (const u of users) {
        // clerk_user_id is left null: these seed accounts are linked to a Clerk
        // account the first time that person signs in with the same email.
        // Their old passwordHash is deliberately not carried over — Clerk owns
        // credentials now, and this table has no column for one.
        await client.query(
          `INSERT INTO users
             (id, email, client_name, company_name, member_id,
              account_role, tier, credit_line_usd, phone, address,
              is_verified_trade, notify_drops, notify_memos, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,
                   COALESCE($14::timestamptz, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            u.id, u.email, u.clientName, u.companyName ?? '',
            u.memberId, u.accountRole, u.tier, u.creditLineUSD ?? 0,
            u.phone ?? '', u.address ?? '', u.isVerifiedTrade ?? false,
            u.preferences?.notifyDrops ?? true, u.preferences?.notifyMemos ?? true,
            u.createdAt ?? null,
          ]
        );
      }
      console.log(`  users                 ${users.length}`);
    }

    /* gemstones ------------------------------------------------------ */
    if (await isEmpty('gemstones')) {
      const stones = readJson<any>('gemstones.json');
      for (const g of stones) {
        await client.query(
          `INSERT INTO gemstones
             (id, name, category, shape, carat, color, clarity, origin, treatment,
              certification, cert_number, price_usd, price_per_carat, dimensions,
              image, featured, status, description)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (id) DO NOTHING`,
          [
            g.id, g.name, g.category, g.shape, g.carat, g.color, g.clarity,
            g.origin, g.treatment, g.certification, g.certNumber, g.priceUSD,
            g.pricePerCarat, g.dimensions ?? '', g.image ?? '',
            g.featured ?? false, g.status, g.description ?? '',
          ]
        );
      }
      console.log(`  gemstones             ${stones.length}`);

      // savedStoneIds was an array on the user record; it becomes join rows.
      let saved = 0;
      for (const u of readJson<any>('users.json')) {
        for (const stoneId of u.savedStoneIds ?? []) {
          const res = await client.query(
            `INSERT INTO saved_stones (user_id, gemstone_id) VALUES ($1,$2)
             ON CONFLICT DO NOTHING`,
            [u.id, stoneId]
          );
          saved += res.rowCount ?? 0;
        }
      }
      console.log(`  saved_stones          ${saved}`);
    }

    /* consultation services ------------------------------------------ */
    if (await isEmpty('consultation_services')) {
      const services = readJson<any>('services.json');
      for (const s of services) {
        await client.query(
          `INSERT INTO consultation_services
             (id, title, duration, type, fee, description, suitable_for,
              sort_order, is_active)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
           ON CONFLICT (id) DO NOTHING`,
          [
            s.id, s.title, s.duration, s.type, s.fee, s.description ?? '',
            s.suitableFor ?? '', s.sortOrder ?? 0, s.isActive ?? true,
          ]
        );
      }
      console.log(`  consultation_services ${services.length}`);
    }

    /* bookings -------------------------------------------------------- */
    if (await isEmpty('bookings')) {
      const bookings = readJson<any>('bookings.json');

      // Some seed bookings name a service that predates services.json
      // ('vault-consultation', 'vault-viewing'). The FK is nulled for those
      // rather than dropping the booking — service_title records what was
      // actually booked, which is the part that matters historically.
      const known = new Set(
        (await client.query<{ id: string }>('SELECT id FROM consultation_services')).rows.map(
          (r) => r.id
        )
      );

      for (const b of bookings) {
        await client.query(
          `INSERT INTO bookings
             (id, service_id, service_title, appointment_date, appointment_time,
              client_name, company_name, email, phone, specific_inquiry,
              status, reference_number, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,
                   COALESCE($13::timestamptz, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            b.id,
            known.has(b.serviceId) ? b.serviceId : null,
            b.serviceTitle, asDate(b.date), b.time, b.clientName,
            b.companyName ?? '', b.email, b.phone ?? '', b.specificInquiry ?? '',
            b.status, b.referenceNumber, b.createdAt ?? null,
          ]
        );
      }
      console.log(`  bookings              ${bookings.length}`);
    }

    /* memos ----------------------------------------------------------- */
    if (await isEmpty('memos')) {
      const memos = readJson<any>('memos.json');
      for (const m of memos) {
        // daysRemaining was a stored countdown; convert it to a real deadline.
        await client.query(
          `INSERT INTO memos
             (id, user_id, member_id, company_name, gemstone_id, stone_name,
              date_dispatched, inspection_due, courier, tracking,
              declared_value_usd, status, notes, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,CURRENT_DATE + $8::int,$9,$10,$11,$12,$13,
                   COALESCE($14::timestamptz, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            m.id, m.userId, m.memberId, m.companyName ?? '', m.stoneId ?? null,
            m.stoneName, asDate(m.dateDispatched),
            Math.max(0, Number(m.daysRemaining ?? 0)),
            m.courier ?? '', m.tracking ?? '', m.declaredValueUSD ?? 0,
            m.status, m.notes ?? null, m.createdAt ?? null,
          ]
        );
      }
      console.log(`  memos                 ${memos.length}`);
    }

    /* orders + line items --------------------------------------------- */
    if (await isEmpty('orders')) {
      const orders = readJson<any>('orders.json');
      let items = 0;
      for (const o of orders) {
        await client.query(
          `INSERT INTO orders
             (id, user_id, member_id, client_name, company_name, email,
              total_usd, payment_method, shipping_service, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                   COALESCE($11::timestamptz, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            o.id, o.userId ?? null, o.memberId ?? null, o.clientName,
            o.companyName ?? '', o.email, o.totalUSD, o.paymentMethod,
            o.shippingService, o.status, o.createdAt ?? null,
          ]
        );
        for (const i of o.items ?? []) {
          await client.query(
            `INSERT INTO order_items
               (order_id, gemstone_id, name, carat, price_usd, quantity)
             VALUES ($1,$2,$3,$4,$5,$6)`,
            [o.id, i.gemstoneId ?? null, i.name, i.carat, i.priceUSD, i.quantity]
          );
          items++;
        }
      }
      console.log(`  orders                ${orders.length} (${items} line items)`);
    }

    /* quote requests --------------------------------------------------- */
    if (await isEmpty('quote_requests')) {
      const quotes = readJson<any>('quotes.json');
      for (const q of quotes) {
        await client.query(
          `INSERT INTO quote_requests
             (id, gem_type, shape, carat_min, carat_max, target_budget, quantity,
              certification_preference, jeweller_business, contact_email, notes,
              estimated_unit_price, estimated_total, status, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,
                   COALESCE($15::timestamptz, now()))
           ON CONFLICT (id) DO NOTHING`,
          [
            q.id, q.gemType, q.shape, q.caratMin, q.caratMax, q.targetBudget ?? 0,
            q.quantity, q.certificationPreference ?? '', q.jewellerBusiness,
            q.contactEmail, q.notes ?? '', q.estimatedUnitPrice ?? null,
            q.estimatedTotal ?? null, q.status, q.createdAt ?? null,
          ]
        );
      }
      console.log(`  quote_requests        ${quotes.length}`);
    }

    /* blog posts -------------------------------------------------------- */
    if (await isEmpty('blog_posts')) {
      const posts = readJson<any>('blogPosts.json');
      for (const p of posts) {
        await client.query(
          `INSERT INTO blog_posts
             (id, title, category, read_time, published_on, display_date, excerpt,
              author, author_role, image, body_paragraphs, sort_order, is_published)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           ON CONFLICT (id) DO NOTHING`,
          [
            p.id, p.title, p.category, p.readTime ?? '',
            // display_date is prose ("September 2, 2026"); published_on is the
            // sortable value, left null when it cannot be parsed.
            Number.isNaN(Date.parse(p.date)) ? null : new Date(p.date).toISOString().split('T')[0],
            p.date ?? '', p.excerpt ?? '', p.author, p.authorRole ?? '',
            p.image ?? '', p.content ?? [], p.sortOrder ?? 0, p.isPublished ?? true,
          ]
        );
      }
      console.log(`  blog_posts            ${posts.length}`);
    }

    /* policies + sections ------------------------------------------------ */
    if (await isEmpty('policies')) {
      const policies = readJson<any>('policies.json');
      let sections = 0;
      for (const p of policies) {
        await client.query(
          `INSERT INTO policies (id, slug, title, subtitle, sort_order)
           VALUES ($1,$2,$3,$4,$5)
           ON CONFLICT (id) DO NOTHING`,
          [p.id, p.slug, p.title, p.subtitle ?? '', p.sortOrder ?? 0]
        );
        for (const s of p.sections ?? []) {
          await client.query(
            `INSERT INTO policy_sections (policy_id, heading, body, sort_order)
             VALUES ($1,$2,$3,$4)
             ON CONFLICT (policy_id, sort_order) DO NOTHING`,
            [p.id, s.heading, s.text, s.sortOrder ?? 0]
          );
          sections++;
        }
      }
      console.log(`  policies              ${policies.length} (${sections} sections)`);
    }
  });
}

async function main(): Promise<void> {
  const shouldReset = process.argv.includes('--reset');

  const target = (process.env.DATABASE_URL ?? '').replace(/:[^:@/]*@/, ':****@');
  console.log(`\nYosenaMora — database migration\n  target: ${target}\n`);

  try {
    if (shouldReset) await reset();
    await applySchema();
    console.log('• Seeding');
    await seed();
    console.log('\n✓ Database ready\n');
  } catch (err: any) {
    console.error('\n✗ Migration failed:', err?.message ?? err);
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();

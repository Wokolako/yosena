/**
 * Grants or revokes trade desk admin rights.
 *
 *   npm run db:grant-admin -- someone@example.com
 *   npm run db:grant-admin -- someone@example.com trade_partner   (revoke)
 *   npm run db:grant-admin -- --list
 *
 * Roles live in this database, not in Clerk. Clerk establishes who someone is;
 * account_role decides what they may do. That means the first admin has to be
 * set here rather than through any screen in the app — otherwise granting
 * admin would itself require being an admin.
 *
 * A person must have signed in at least once before their row exists, unless
 * the row was seeded. Run with --list to see what is there.
 */

import '../loadEnv';
import { closePool, query } from './pool';
import { db } from './db';

const ROLES = ['admin', 'trade_partner', 'jeweller'] as const;
type Role = (typeof ROLES)[number];

async function list(): Promise<void> {
  const rows = await query<any>(
    `SELECT email, client_name, account_role, clerk_user_id
       FROM users ORDER BY account_role, email`
  );

  if (rows.length === 0) {
    console.log('\nNo accounts yet. Sign in once through the site to create one.\n');
    return;
  }

  console.log('\n  role           linked  email');
  console.log('  ─────────────  ──────  ─────────────────────────────────');
  for (const r of rows) {
    const linked = r.clerk_user_id ? 'yes   ' : 'no    ';
    console.log(`  ${String(r.account_role).padEnd(13)}  ${linked}  ${r.email}`);
  }
  console.log('\n  "linked: no" means nobody has signed in with that address yet.\n');
}

async function main(): Promise<void> {
  const args = process.argv.slice(2).filter((a) => a !== '--');

  try {
    if (args.length === 0 || args[0] === '--list') {
      await list();
      return;
    }

    const email = args[0];
    const role = (args[1] ?? 'admin') as Role;

    if (!ROLES.includes(role)) {
      console.error(`\n✗ Role must be one of: ${ROLES.join(', ')}\n`);
      process.exitCode = 2;
      return;
    }

    let updated = await db.setUserRoleByEmail(email, role);

    if (!updated) {
      // No row yet. Create a pending one so the role is already in place when
      // that person first signs in — resolveClerkUser() adopts a record whose
      // email matches, so they land as an admin on their very first visit
      // rather than having to sign in, run this, then sign in again.
      const id = `usr-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const memberId = `YM-DESK-${Math.floor(1000 + Math.random() * 9000)}`;

      await query(
        `INSERT INTO users
           (id, email, client_name, company_name, member_id, account_role,
            tier, credit_line_usd, is_verified_trade)
         VALUES ($1,$2,$3,'',$4,$5,'Trade Desk',0,TRUE)`,
        [id, email.toLowerCase(), email.split('@')[0], memberId, role]
      );

      updated = await db.getUserById(id);
      console.log(`\n  Created a pending account for ${email}.`);
    }

    console.log(`\n✓ ${updated.email} is now ${updated.accountRole}`);
    if (!updated.clerkUserId) {
      console.log(
        '  Note: no Clerk account is linked to this address yet. The role takes\n' +
          '  effect the first time someone signs in with it.'
      );
    }
    console.log('');
  } catch (err: any) {
    console.error('\n✗ Failed:', err?.message ?? err, '\n');
    process.exitCode = 1;
  } finally {
    await closePool();
  }
}

main();

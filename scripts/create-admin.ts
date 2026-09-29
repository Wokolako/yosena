/*
 * Creates an admin account, or resets an existing account to admin with a new password.
 * This is the only way to make an admin — the website's sign-up never can.
 *
 *   npm run create-admin -- --email you@example.com --name "Your Name"
 *
 * The password is asked for without echoing it. For automated setups, pass it in the
 * ADMIN_PASSWORD environment variable instead (never as a command-line argument,
 * which would end up in shell history).
 */
import readline from 'readline';
import { db, UserRecord } from '../backend/store/db';
import { hashPassword } from '../backend/auth/password';
import { newId, newReference } from '../backend/lib/ids';

const PASSWORD_MIN = 12;
const PASSWORD_MAX = 72;

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function ask(question: string, hidden = false): Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
  if (hidden) {
    (rl as any)._writeToOutput = (s: string) => {
      if (s.includes(question)) (rl as any).output.write(s);
    };
  }
  return new Promise((resolve) =>
    rl.question(question, (answer) => {
      rl.close();
      if (hidden) process.stdout.write('\n');
      resolve(answer);
    })
  );
}

async function main() {
  const email = (arg('email') || (await ask('Admin email: '))).trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('That is not a valid email address.');

  const existing = db.all('users').find((u) => u.email.toLowerCase() === email);
  const name = (arg('name') || existing?.clientName || (await ask('Full name: '))).trim();
  if (!name) throw new Error('A name is required.');

  let password = process.env.ADMIN_PASSWORD || '';
  if (!password) {
    password = await ask(`Password (at least ${PASSWORD_MIN} characters): `, true);
    const again = await ask('Repeat password: ', true);
    if (password !== again) throw new Error('The passwords do not match.');
  }
  if (password.length < PASSWORD_MIN) throw new Error(`Use at least ${PASSWORD_MIN} characters.`);
  if (Buffer.byteLength(password, 'utf8') > PASSWORD_MAX) throw new Error(`Use at most ${PASSWORD_MAX} bytes.`);

  if (existing) {
    const answer = await ask(`An account for ${email} exists (${existing.accountRole}, ${existing.status ?? 'active'}). Make it an active admin with this new password? [y/N] `);
    if (answer.trim().toLowerCase() !== 'y') {
      console.log('No changes made.');
      return;
    }
  }

  const passwordHash = await hashPassword(password);
  const now = new Date().toISOString();

  db.transaction((tx) => {
    const users = tx.get('users');
    const user = users.find((u) => u.email.toLowerCase() === email);
    if (user) {
      user.passwordHash = passwordHash;
      user.accountRole = 'admin';
      user.status = 'active';
      user.clientName = name;
      user.updatedAt = now;
    } else {
      const admin: UserRecord = {
        id: newId('usr'),
        email,
        passwordHash,
        clientName: name,
        companyName: arg('company') || 'YosenaMora Trade Desk',
        memberId: newReference('YM-ADMIN'),
        accountRole: 'admin',
        status: 'active',
        tier: 'Trade Desk Administrator',
        creditLineUSD: 0,
        phone: '',
        address: '',
        isVerifiedTrade: true,
        createdAt: now,
        savedStoneIds: [],
        preferences: { notifyDrops: false, notifyMemos: false },
      };
      users.push(admin);
    }
    tx.set('users', users);
  });

  console.log(`Admin ready: ${email}. Sign in on the site, then open /admin.`);
}

main().catch((err) => {
  console.error(`Error: ${err.message}`);
  process.exit(1);
});

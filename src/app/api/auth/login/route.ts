import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { comparePassword } from '@backend/auth/password';
import { startSession, toPublicUser, accountStatus } from '@backend/auth/session';
import { handle, ok, readJson, assertSameOrigin, clientIp, HttpError } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const body = await readJson(req, 8_000);
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !password) throw new HttpError(400, 'Email and password are required.');

  rateLimit(`login:ip:${clientIp(req)}`, 20, 15 * 60_000);
  rateLimit(`login:email:${email}`, 8, 15 * 60_000);

  const user = db.all('users').find((u) => u.email.toLowerCase() === email);
  // Always run a bcrypt comparison so unknown emails and wrong passwords look identical.
  const matches = await comparePassword(password, user?.passwordHash);
  if (!user || !matches) throw new HttpError(401, 'Invalid email or password.');
  if (accountStatus(user) === 'disabled') {
    throw new HttpError(403, 'This account has been disabled. Please contact the trade desk.');
  }

  db.transaction((tx) => {
    const users = tx.get('users');
    const record = users.find((u) => u.id === user.id);
    if (record) record.lastLoginAt = new Date().toISOString();
    tx.set('users', users);
  });

  await startSession(user);
  return ok({ user: toPublicUser(user) });
});

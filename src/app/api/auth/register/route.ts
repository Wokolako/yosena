import { NextRequest } from 'next/server';
import { db, UserRecord } from '@backend/store/db';
import { hashPassword } from '@backend/auth/password';
import { startSession, toPublicUser } from '@backend/auth/session';
import { handle, ok, readJson, assertSameOrigin, clientIp, HttpError } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';
import { newId, newReference } from '@backend/lib/ids';
import * as v from '@backend/lib/validate';

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  rateLimit(`register:ip:${clientIp(req)}`, 5, 60 * 60_000);
  const body = await readJson(req, 8_000);

  const email = v.email(body.email);
  const password = v.password(body.password);
  const clientName = v.str(body.clientName, 'Your name', { required: true, max: 120 });
  const companyName = v.str(body.companyName, 'Company name', { required: true, max: 160 });
  const phone = v.str(body.phone, 'Phone', { max: 40 });
  const address = v.str(body.address, 'Address', { max: 300 });

  const passwordHash = await hashPassword(password);

  // New accounts wait for the trade desk: no trade status and no memo credit until an admin approves them.
  const user: UserRecord = {
    id: newId('usr'),
    email,
    passwordHash,
    clientName,
    companyName,
    memberId: newReference('YM'),
    accountRole: 'trade_partner',
    status: 'pending',
    tier: 'Pending verification',
    creditLineUSD: 0,
    phone,
    address,
    isVerifiedTrade: false,
    createdAt: new Date().toISOString(),
    savedStoneIds: [],
    preferences: { notifyDrops: true, notifyMemos: true },
  };

  db.transaction((tx) => {
    const users = tx.get('users');
    if (users.some((u) => u.email.toLowerCase() === email)) {
      throw new HttpError(409, 'An account with this email address already exists. Try signing in.');
    }
    users.push(user);
    tx.set('users', users);
  });

  await startSession(user);
  return ok(
    {
      message: 'Registration received. Our trade desk will verify your business before trade features are enabled.',
      user: toPublicUser(user),
    },
    201
  );
});

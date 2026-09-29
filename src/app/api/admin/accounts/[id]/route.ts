import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireAdmin, toPublicUser, accountStatus } from '@backend/auth/session';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';
import * as v from '@backend/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

/**
 * Trade account approval and limits. Roles cannot be changed here: admin accounts
 * are created only with `npm run create-admin` on the server.
 */
export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson(req);

  const status = body.status !== undefined ? v.oneOf(body.status, 'Status', ['pending', 'active', 'disabled'] as const) : undefined;
  const isVerifiedTrade = body.isVerifiedTrade !== undefined ? !!body.isVerifiedTrade : undefined;
  const tier = body.tier !== undefined ? v.str(body.tier, 'Tier', { max: 80 }) : undefined;
  const creditLineUSD =
    body.creditLineUSD !== undefined ? v.num(body.creditLineUSD, 'Memo credit line', { min: 0, max: 1_000_000_000, integer: true }) : undefined;
  if (body.accountRole !== undefined) throw new HttpError(400, 'Roles cannot be changed from the admin area.');

  const user = db.transaction((tx) => {
    const users = tx.get('users');
    const user = users.find((u) => u.id === id);
    if (!user) throw new HttpError(404, 'Account not found.');
    if (user.id === admin.id && status !== undefined && status !== 'active') {
      throw new HttpError(400, 'You cannot disable or suspend your own account.');
    }
    const before = { status: accountStatus(user), isVerifiedTrade: user.isVerifiedTrade, tier: user.tier, creditLineUSD: user.creditLineUSD };
    if (status !== undefined) user.status = status;
    if (isVerifiedTrade !== undefined) user.isVerifiedTrade = isVerifiedTrade;
    if (tier !== undefined) user.tier = tier;
    if (creditLineUSD !== undefined) user.creditLineUSD = creditLineUSD;
    user.updatedAt = new Date().toISOString();
    tx.set('users', users);
    audit(tx, admin, 'account.update', user.email, { before, after: { status, isVerifiedTrade, tier, creditLineUSD } });
    return user;
  });

  return ok({ message: 'Account updated.', data: toPublicUser(user) });
});

import { cookies } from 'next/headers';
import { db, UserRecord, AccountStatus } from '../store/db';
import { signSession, verifySession } from './jwt';
import { HttpError } from '../lib/http';

/*
 * The one place that decides who is signed in. Route handlers and server pages call
 * these helpers; nothing trusts a role sent by the browser.
 */

export const SESSION_COOKIE = 'ym_session';
const CUSTOMER_TTL_SECONDS = 7 * 24 * 60 * 60;
const ADMIN_TTL_SECONDS = 8 * 60 * 60;

export interface PublicUser {
  id: string;
  email: string;
  clientName: string;
  companyName: string;
  memberId: string;
  accountRole: UserRecord['accountRole'];
  status: AccountStatus;
  tier: string;
  creditLineUSD: number;
  phone: string;
  address: string;
  isVerifiedTrade: boolean;
  createdAt: string;
  savedStoneIds: string[];
  preferences: { notifyDrops: boolean; notifyMemos: boolean };
}

export const accountStatus = (u: Pick<UserRecord, 'status'>): AccountStatus => u.status ?? 'active';

/** An approved trade account: may pay online and request memos. */
export const isApprovedTrade = (u: UserRecord | null | undefined) =>
  !!u && accountStatus(u) === 'active' && u.isVerifiedTrade;

export function toPublicUser(u: UserRecord): PublicUser {
  return {
    id: u.id,
    email: u.email,
    clientName: u.clientName,
    companyName: u.companyName,
    memberId: u.memberId,
    accountRole: u.accountRole,
    status: accountStatus(u),
    tier: u.tier,
    creditLineUSD: u.creditLineUSD,
    phone: u.phone,
    address: u.address,
    isVerifiedTrade: !!u.isVerifiedTrade,
    createdAt: u.createdAt,
    savedStoneIds: Array.isArray(u.savedStoneIds) ? u.savedStoneIds : [],
    preferences: {
      notifyDrops: !!u.preferences?.notifyDrops,
      notifyMemos: !!u.preferences?.notifyMemos,
    },
  };
}

export async function startSession(user: UserRecord): Promise<void> {
  const ttl = user.accountRole === 'admin' ? ADMIN_TTL_SECONDS : CUSTOMER_TTL_SECONDS;
  const store = await cookies();
  store.set(SESSION_COOKIE, signSession(user.id, ttl), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: ttl,
  });
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

/** The signed-in, non-disabled user, or null. */
export async function getSessionUser(): Promise<UserRecord | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const payload = verifySession(token);
  if (!payload) return null;
  const user = db.all('users').find((u) => u.id === payload.sub);
  if (!user || accountStatus(user) === 'disabled') return null;
  return user;
}

export async function requireUser(): Promise<UserRecord> {
  const user = await getSessionUser();
  if (!user) throw new HttpError(401, 'Please sign in to continue.');
  return user;
}

/** Non-admins get a plain 404, so the admin API does not advertise itself. */
export async function requireAdmin(): Promise<UserRecord> {
  const user = await getSessionUser();
  if (!user || user.accountRole !== 'admin') throw new HttpError(404, 'Not found.');
  return user;
}

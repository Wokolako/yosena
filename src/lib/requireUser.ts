import { auth, currentUser } from '@clerk/nextjs/server';
import { db, UserData } from '../../backend/data/db';

/**
 * Resolves the Clerk session to this app's trade record.
 *
 * Route handlers used to read a bearer token and trust its claims; identity now
 * comes from Clerk, and role, member id and credit line are read from the
 * database rather than from anything the client sends. Returns null when there
 * is no session.
 */
export async function getTradeUser(): Promise<UserData | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const existing = await db.getUserByClerkId(userId);
  if (existing) return existing;

  // First request of a brand-new account, before /api/auth/me has run.
  const clerkUser = await currentUser();
  if (!clerkUser) return null;

  const email =
    clerkUser.primaryEmailAddress?.emailAddress ??
    clerkUser.emailAddresses[0]?.emailAddress ??
    '';

  const clientName =
    [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
    clerkUser.username ||
    email;

  return db.resolveClerkUser({ clerkUserId: userId, email, clientName });
}

export const isStaff = (user: UserData | null): boolean =>
  user?.accountRole === 'admin' || user?.accountRole === 'trade_partner';

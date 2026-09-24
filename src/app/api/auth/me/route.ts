import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '../../../../../backend/data/db';

/**
 * Returns the caller's trade profile.
 *
 * Clerk owns identity; this joins the authenticated Clerk account to the trade
 * record that carries member id, tier, credit line and role. There is no login
 * or register endpoint any more — Clerk handles both, and the trade record is
 * provisioned here on first sign-in.
 */
export async function GET() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    const clerkUser = await currentUser();

    if (!clerkUser) {
      return NextResponse.json(
        { success: false, error: 'Clerk account could not be loaded.' },
        { status: 401 }
      );
    }

    const email =
      clerkUser.primaryEmailAddress?.emailAddress ??
      clerkUser.emailAddresses[0]?.emailAddress ??
      '';

    const clientName =
      [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') ||
      clerkUser.username ||
      email;

    const user = await db.resolveClerkUser({ clerkUserId: userId, email, clientName });

    return NextResponse.json({ success: true, user });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to load profile.', details: err?.message },
      { status: 500 }
    );
  }
}

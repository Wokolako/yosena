import { NextResponse } from 'next/server';
import { UserData } from '../../backend/data/db';
import { getTradeUser } from './requireUser';

/**
 * Gate for every /api/admin route.
 *
 * Two things are deliberately separate here: Clerk says *who* you are, and the
 * account_role column says *what you may do*. A Clerk account alone grants
 * nothing — the role is read from the database on each request, so revoking
 * someone's admin rights takes effect immediately rather than whenever their
 * session token happens to expire.
 *
 * Flat rather than a discriminated union: this project compiles with
 * `strict: false`, and without strictNullChecks TypeScript will not narrow on a
 * boolean-literal discriminant — the same reason AuthContext's AuthResult is
 * shaped this way. Callers check `response` first:
 *
 *     const gate = await requireAdmin();
 *     if (gate.response) return gate.response;
 *     // gate.user is the admin from here on
 */
export interface AdminGate {
  user?: UserData;
  response?: NextResponse;
}

export async function requireAdmin(): Promise<AdminGate> {
  const user = await getTradeUser();

  if (!user) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      ),
    };
  }

  if (user.accountRole !== 'admin') {
    return {
      response: NextResponse.json(
        { success: false, error: 'This area is restricted to trade desk administrators.' },
        { status: 403 }
      ),
    };
  }

  return { user };
}

import { NextResponse } from 'next/server';
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';

/**
 * Most of this site is a public shopfront — the catalog, the Gazette, the
 * policies and the consultation booking form are all readable without an
 * account. Protection is therefore opt-in: anything not listed here is public.
 *
 * Only API routes are listed. The member vault and trade desk are rendered by
 * the single page at '/' from client state rather than at their own URLs, so
 * there is no path for the proxy to match — those views gate themselves on the
 * Clerk session, and the data behind them is protected here.
 */
const isProtectedRoute = createRouteMatcher([
  '/api/auth/me',
  '/api/memos(.*)',
  '/api/orders(.*)',
  // The whole trade desk. Signing in is only the first gate — each of these
  // routes additionally checks account_role via requireAdmin().
  '/api/admin(.*)',
]);

/**
 * Checkout is open to guests — a jeweller can buy without holding an account,
 * and the route records the order with no user attached. Only *reading* orders
 * back is account-scoped, so POST is let through.
 */
const isGuestCheckout = createRouteMatcher(['/api/orders(.*)']);

export default clerkMiddleware(async (auth, request) => {
  if (!isProtectedRoute(request)) return;
  if (request.method === 'POST' && isGuestCheckout(request)) return;

  const { userId } = await auth();
  if (userId) return;

  // auth.protect() answers with a 307 to the sign-in page. That is right for a
  // page request, but an API caller would then parse a login page as JSON and
  // report a parse failure instead of "not signed in", so these get a 401.
  return NextResponse.json(
    { success: false, error: 'Authentication required.' },
    { status: 401 }
  );
});

export const config = {
  matcher: [
    // Everything except Next internals and static assets.
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
    // Clerk's auto-proxy path.
    '/__clerk/:path*',
  ],
};

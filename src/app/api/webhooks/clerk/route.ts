import { NextRequest, NextResponse } from 'next/server';
import { verifyWebhook } from '@clerk/nextjs/webhooks';
import { db } from '../../../../../backend/data/db';

/**
 * Clerk's account events, written straight into the trade ledger.
 *
 * Sign-in is Clerk and only Clerk, so every member of this business starts as a
 * Clerk account. The app already provisions a trade record the first time a
 * signed-in visitor loads a page, but that depends on them coming back to the
 * site: someone who signs up through Clerk's own hosted pages, or is invited
 * from the Clerk dashboard, would otherwise not exist here until they happened
 * to return. This endpoint closes that gap by capturing the account at the
 * moment Clerk creates it.
 *
 * It is unauthenticated by necessity — Clerk's servers call it, not a browser —
 * so the Svix signature is the only thing standing between this and an open
 * write endpoint. verifyWebhook throws on a bad signature and nothing is
 * written. Without CLERK_WEBHOOK_SIGNING_SECRET set it always throws, which is
 * the correct failure: better silent than forgeable.
 */
export async function POST(req: NextRequest) {
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;

  try {
    evt = await verifyWebhook(req);
  } catch (err: any) {
    console.error('[clerk webhook] signature verification failed:', err?.message);
    return NextResponse.json(
      { success: false, error: 'Signature verification failed.' },
      { status: 400 }
    );
  }

  try {
    switch (evt.type) {
      case 'user.created':
      case 'user.updated': {
        const data: any = evt.data;

        // Clerk keeps several addresses; the primary one is the one the desk
        // corresponds with. Fall back to the first on record rather than
        // storing nothing.
        const emails: any[] = data.email_addresses ?? [];
        const primary =
          emails.find((e) => e.id === data.primary_email_address_id) ?? emails[0];
        const email = primary?.email_address ?? '';

        if (!email) {
          // An account with no address cannot be corresponded with or matched
          // to an existing record, so there is nothing useful to store yet.
          // Clerk sends user.updated once one is added.
          return NextResponse.json({ success: true, skipped: 'no email address' });
        }

        const clientName =
          [data.first_name, data.last_name].filter(Boolean).join(' ') ||
          data.username ||
          email;

        // The same routine the app uses on first sign-in: link an existing
        // record by address, or open a new unverified trade account.
        const user = await db.resolveClerkUser({
          clerkUserId: data.id,
          email,
          clientName,
        });

        return NextResponse.json({ success: true, event: evt.type, userId: user.id });
      }

      case 'user.deleted': {
        const unlinked = await db.unlinkClerkUser(String((evt.data as any).id));
        return NextResponse.json({ success: true, event: evt.type, unlinked });
      }

      default:
        // Clerk sends far more than this endpoint cares about. Acknowledging
        // them keeps Clerk from retrying events we deliberately ignore.
        return NextResponse.json({ success: true, ignored: evt.type });
    }
  } catch (err: any) {
    // A non-2xx tells Clerk to retry, which is what we want for a transient
    // database problem.
    console.error('[clerk webhook] handler failed:', err?.message);
    return NextResponse.json(
      { success: false, error: 'Failed to record the account event.' },
      { status: 500 }
    );
  }
}

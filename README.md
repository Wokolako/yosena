<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://ai.google.dev/static/site-assets/images/share-ais-513315318.png" />
</div>

# yosena

YosenaMora storefront, trade member portal and admin console (Next.js 16).

View your app in AI Studio: https://ai.studio/apps/dd9ce8a6-4f14-469b-b183-fe0cc876e093

## Run locally

**Prerequisites:** Node.js

1. Install dependencies: `npm install`
2. Copy `.env.example` to `.env.local` and set at least:
   - `GEMINI_API_KEY` — for the AI concierge
   - `JWT_SECRET` — 32+ random characters (required in production; the command to generate one is in `.env.example`)
3. Create your admin account (asks for the password without showing it):
   `npm run create-admin -- --email you@example.com --name "Your Name"`
4. Run the app: `npm run dev`

## How it fits together

- **One backend.** API routes live in `src/app/api/`; business logic in `backend/` (`store/` data, `auth/` sessions, `lib/commerce.ts` checkout, `payments/` gateway).
- **Data.** Runtime data is stored in `backend/data/*.json` (not committed). On first run it is seeded from `backend/seed/` (catalog, journal, services, policies). This store is for a single server with a persistent disk; move to a database before scaling out or deploying to serverless hosting.
- **Sessions.** An httpOnly cookie; the role is read from the data store on every request.

## Admin console

Sign in on the site with an admin account, then open `/admin` (an Admin link appears in the header). Everyone else gets a 404. Admin accounts can only be created with `npm run create-admin` — never through sign-up.

From the console the trade desk can: edit inventory (add, edit, archive stones, set status), process orders (confirm wires, ship, cancel, record refunds), approve and close memos, confirm bookings and set opening hours, answer quote requests, verify trade accounts and set credit lines, edit the journal, services and policies (with drafts), and read concierge conversations and the audit log. Changes show on the site on the next page load.

## Checkout and payments

The browser sends only stone IDs; the server prices the order, reserves the stones, and releases them automatically if payment does not arrive in time.

- **Bank wire** — always available. The order waits as "Awaiting bank wire" until an admin marks the payment received.
- **Online payment (Stripe Checkout)** — switched on when `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` are set. Point a Stripe webhook at `/api/webhooks/stripe` with the events `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed` and `checkout.session.expired`. Stripe must approve the business first (high-value goods and precious stones are a restricted category), and the business must be registered in a Stripe-supported country.
- **14-day inspection memo** — for approved trade accounts, within their credit line; an admin approves each request.

See `.env.example` for limits, hold times, tax rate and promo codes.

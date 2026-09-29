import type { ShippingOption, CheckoutConfig } from '../src/types';

/*
 * Commerce settings. Everything that affects a price lives here, on the server;
 * the browser only ever receives the public parts through `publicCheckoutConfig`.
 */

const num = (value: string | undefined, fallback: number) => {
  const n = Number(value);
  return value !== undefined && value !== '' && Number.isFinite(n) ? n : fallback;
};
const bool = (value: string | undefined, fallback: boolean) =>
  value === undefined || value === '' ? fallback : value === 'true';

export const SHIPPING_OPTIONS: ShippingOption[] = [
  { id: 'armored', label: 'Malca-Amit Armored Express', description: 'Full underwriters coverage, door-to-vault', priceUSD: 250 },
  { id: 'ferrari', label: 'Ferrari Logistics International', description: 'Dedicated armed escort & customs liaison', priceUSD: 320 },
  { id: 'usps', label: 'USPS RTC Registered Mail', description: 'Locked cage transit (domestic only)', priceUSD: 45 },
];

/** Placeholder rate carried over from the original cart. Set TAX_RATE for your jurisdiction (e.g. 0.2 for 20%), or 0. */
export const TAX_RATE = () => num(process.env.TAX_RATE, 0.05);

/** Discount codes, e.g. PROMO_CODES="TRADE10:10,VIP5:5". None are active unless configured. */
export function promoCodes(): Record<string, number> {
  const codes: Record<string, number> = {};
  for (const entry of (process.env.PROMO_CODES || '').split(',')) {
    const [code, pct] = entry.split(':').map((s) => s?.trim());
    const percent = Number(pct);
    if (code && percent > 0 && percent <= 50) codes[code.toUpperCase()] = percent;
  }
  return codes;
}

/** How long a stone stays reserved while the buyer pays. */
export const HOLD = {
  cardMinutes: () => num(process.env.CARD_HOLD_MINUTES, 45),
  wireHours: () => num(process.env.WIRE_HOLD_HOURS, 72),
  memoHours: () => num(process.env.MEMO_HOLD_HOURS, 72),
};

export const MEMO_DAYS = 14;

export const stripeEnabled = () => !!(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

/** Largest order that may be paid online. Stripe caps non-card payments at 999,999.99, so the default stays below that. */
export const CARD_LIMIT_USD = () => num(process.env.CARD_PAYMENT_LIMIT_USD, 999_999);

/** Online payment needs an approved trade account unless explicitly switched off. */
export const CARD_REQUIRES_APPROVED_ACCOUNT = () => bool(process.env.CARD_REQUIRES_APPROVED_ACCOUNT, true);

/** Optional bank details shown to buyers who choose wire transfer. */
export const WIRE_BANK_DETAILS = () => (process.env.WIRE_BANK_DETAILS || '').trim();

export function publicCheckoutConfig(): CheckoutConfig {
  return {
    shippingOptions: SHIPPING_OPTIONS,
    cardEnabled: stripeEnabled(),
    cardLimitUSD: CARD_LIMIT_USD(),
    cardRequiresApprovedAccount: CARD_REQUIRES_APPROVED_ACCOUNT(),
    promoCodesEnabled: Object.keys(promoCodes()).length > 0,
  };
}

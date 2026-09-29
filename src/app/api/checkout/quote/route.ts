import { NextRequest } from 'next/server';
import { quoteCart } from '@backend/lib/commerce';
import { handle, ok, readJson, clientIp } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';
import { parseCart } from '../shared';

/** Server-computed totals for the cart drawer. Nothing is reserved. */
export const POST = handle(async (req: NextRequest) => {
  rateLimit(`quote:ip:${clientIp(req)}`, 120, 60_000);
  const { stoneIds, shippingMethod, promoCode } = parseCart(await readJson(req));
  return ok({ totals: quoteCart(stoneIds, shippingMethod, promoCode) });
});

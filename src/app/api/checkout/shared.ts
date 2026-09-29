import { HttpError } from '@backend/lib/http';
import * as v from '@backend/lib/validate';
import { SHIPPING_OPTIONS } from '@backend/config';

/** Parses the cart part of a checkout or quote request. Prices are never accepted from the browser. */
export function parseCart(body: any) {
  const stoneIds = v.stringArray(body.stoneIds ?? [], 'Cart', { max: 20, maxLength: 80 });
  if (stoneIds.length === 0) throw new HttpError(400, 'Your cart is empty.');
  const shippingMethod = v.oneOf(body.shippingMethod ?? 'armored', 'Delivery option', SHIPPING_OPTIONS.map((o) => o.id));
  const promoCode = v.str(body.promoCode, 'Promo code', { max: 40 }) || null;
  return { stoneIds, shippingMethod, promoCode };
}

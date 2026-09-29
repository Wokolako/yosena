import { NextRequest } from 'next/server';
import { db, QuoteRecord } from '@backend/store/db';
import { getSessionUser } from '@backend/auth/session';
import { handle, ok, readJson, assertSameOrigin, clientIp } from '@backend/lib/http';
import { rateLimit } from '@backend/lib/rateLimit';
import { newReference } from '@backend/lib/ids';
import * as v from '@backend/lib/validate';
import { GEM_CATEGORIES, GEM_SHAPES } from '@/types';
import { CLARITY_TIERS, estimateQuote } from '@/lib/quotePricing';

/**
 * Wholesale quote requests. The estimate is recomputed here with the same formula
 * the calculator shows. Listing requests is admin-only (/api/admin/quotes).
 */
export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  rateLimit(`quote-request:ip:${clientIp(req)}`, 8, 60 * 60_000);
  const body = await readJson(req, 16_000);

  const gemType = v.oneOf(body.gemType, 'Gemstone variety', GEM_CATEGORIES);
  const shape = v.oneOf(body.shape, 'Cut profile', GEM_SHAPES);
  const caratSize = v.num(body.caratSize, 'Carat weight', { min: 0.25, max: 50 });
  const clarityTier = v.oneOf(body.clarityTier, 'Clarity tier', CLARITY_TIERS);
  const quantity = v.num(body.quantity, 'Quantity', { min: 1, max: 50, integer: true });
  const originPreference = v.str(body.originPreference, 'Origin preference', { max: 120 });
  const jewellerBusiness = v.str(body.jewellerBusiness, 'Business name', { required: true, max: 160 });
  const contactEmail = v.email(body.contactEmail);
  const notes = v.str(body.notes, 'Notes', { max: 2000 });

  const estimate = estimateQuote({ gemType, caratSize, clarityTier, quantity });
  const user = await getSessionUser();

  const quote: QuoteRecord = {
    id: newReference('QT'),
    gemType,
    shape,
    caratSize,
    caratMin: caratSize,
    caratMax: caratSize,
    clarityTier,
    originPreference,
    quantity,
    jewellerBusiness,
    contactEmail,
    notes,
    estimatedUnitPrice: estimate.unitPrice,
    estimatedTotal: estimate.total,
    status: 'New',
    userId: user?.id ?? null,
    createdAt: new Date().toISOString(),
  };

  db.transaction((tx) => tx.set('quotes', [quote, ...tx.get('quotes')]));

  return ok(
    {
      message: 'Quote request received. A specialist will reply from the trade desk.',
      data: { id: quote.id, estimatedTotal: quote.estimatedTotal, status: quote.status },
    },
    201
  );
});

import { NextRequest, NextResponse } from 'next/server';
import { db, QuoteData } from '../../../../backend/data/db';
import { requireAdmin } from '../../../lib/requireAdmin';

const BASE_PRICE_PER_CARAT: Record<string, number> = {
  Diamond: 12500,
  Sapphire: 6800,
  Emerald: 8900,
  Ruby: 14000,
  Spinel: 4200,
  Tourmaline: 5800
};

const SHAPE_MULTIPLIERS: Record<string, number> = {
  'Emerald Cut': 1.15,
  'Cushion': 1.05,
  'Round Brilliant': 1.25,
  'Oval': 1.10,
  'Pear': 1.05,
  'Asscher': 1.20
};

/**
 * The wholesale pipeline: target budgets, volumes and jeweller contact
 * addresses. Desk-only, for the same reason as the appointment book. Quote
 * submission and the price calculator (POST, below) remain public.
 */
export async function GET(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get('email');
    const quotes = email ? await db.getQuotesByEmail(email) : await db.getQuotes();

    return NextResponse.json({ success: true, count: quotes.length, data: quotes });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Failed to fetch quote requests.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;

    // Calculation mode
    if (action === 'calculate') {
      const { gemType, shape, caratMin, caratMax, quantity, certification } = body;
      const typeKey = String(gemType || 'Diamond');
      const shapeKey = String(shape || 'Emerald Cut');
      const minC = parseFloat(String(caratMin || 1.5));
      const maxC = parseFloat(String(caratMax || 3.0));
      const qty = parseInt(String(quantity || 1), 10);

      const basePerCarat = BASE_PRICE_PER_CARAT[typeKey] || 7500;
      const shapeMult = SHAPE_MULTIPLIERS[shapeKey] || 1.1;
      const avgCarat = (minC + maxC) / 2;
      const weightMultiplier = Math.pow(avgCarat, 1.25);

      let volumeDiscount = 0;
      if (qty >= 10) volumeDiscount = 0.15;
      else if (qty >= 5) volumeDiscount = 0.10;
      else if (qty >= 3) volumeDiscount = 0.05;

      const unitPrice = Math.round(basePerCarat * shapeMult * weightMultiplier * (1 - volumeDiscount));
      const estimatedTotal = unitPrice * qty;

      return NextResponse.json({
        success: true,
        calculation: {
          gemType: typeKey,
          shape: shapeKey,
          avgCarat: parseFloat(avgCarat.toFixed(2)),
          quantity: qty,
          certification: certification || 'GIA / SSEF',
          estimatedUnitPriceUSD: unitPrice,
          estimatedTotalUSD: estimatedTotal,
          volumeDiscountPercentage: volumeDiscount * 100,
          currency: 'USD',
          pricingValidityDays: 14
        }
      });
    }

    // Submission mode
    const {
      gemType,
      shape,
      caratMin,
      caratMax,
      targetBudget,
      quantity,
      certificationPreference,
      jewellerBusiness,
      contactEmail,
      notes
    } = body;

    if (!gemType || !shape || !contactEmail || !jewellerBusiness) {
      return NextResponse.json(
        { success: false, error: 'Gemstone type, shape, contact email, and jeweller business name are required.' },
        { status: 400 }
      );
    }

    const quoteId = `QT-${Math.floor(9000 + Math.random() * 1000)}`;
    const newQuote: QuoteData = {
      id: quoteId,
      gemType: String(gemType),
      shape: String(shape),
      caratMin: Number(caratMin || 1.0),
      caratMax: Number(caratMax || 3.0),
      targetBudget: Number(targetBudget || 50000),
      quantity: Number(quantity || 1),
      certificationPreference: certificationPreference || 'GIA',
      jewellerBusiness: String(jewellerBusiness).trim(),
      contactEmail: String(contactEmail).trim().toLowerCase(),
      notes: (notes || '').trim(),
      status: 'Trade Desk Underwriting',
      createdAt: new Date().toISOString()
    };

    const saved = await db.createQuote(newQuote);

    return NextResponse.json(
      {
        success: true,
        message: 'Wholesale quote allocation request received. Our trade desk will respond within 4 business hours.',
        data: saved
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Failed to process quote.' }, { status: 500 });
  }
}

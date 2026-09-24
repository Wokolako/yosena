import { Request, Response } from 'express';
import { db, QuoteData } from '../data/db';

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

export const quoteController = {
  calculateQuote(req: Request, res: Response): void {
    try {
      const { gemType, shape, caratMin, caratMax, quantity, certification } = req.body;

      const typeKey = String(gemType || 'Diamond');
      const shapeKey = String(shape || 'Emerald Cut');
      const minC = parseFloat(String(caratMin || 1.5));
      const maxC = parseFloat(String(caratMax || 3.0));
      const qty = parseInt(String(quantity || 1), 10);

      const basePerCarat = BASE_PRICE_PER_CARAT[typeKey] || 7500;
      const shapeMult = SHAPE_MULTIPLIERS[shapeKey] || 1.1;
      const avgCarat = (minC + maxC) / 2;

      // Weight tier scaling (larger stones command exponential premium)
      const weightMultiplier = Math.pow(avgCarat, 1.25);

      // Volume trade discount
      let volumeDiscount = 0;
      if (qty >= 10) volumeDiscount = 0.15;
      else if (qty >= 5) volumeDiscount = 0.10;
      else if (qty >= 3) volumeDiscount = 0.05;

      const unitPrice = Math.round(basePerCarat * shapeMult * weightMultiplier * (1 - volumeDiscount));
      const estimatedTotal = unitPrice * qty;

      res.status(200).json({
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
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to calculate quote.' });
    }
  },

  async submitQuoteRequest(req: Request, res: Response): Promise<void> {
    try {
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
      } = req.body;

      if (!gemType || !shape || !contactEmail || !jewellerBusiness) {
        res.status(400).json({
          success: false,
          error: 'Gemstone type, shape, contact email, and jeweller business name are required.'
        });
        return;
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

      res.status(201).json({
        success: true,
        message: 'Wholesale quote allocation request received. Our trade desk will respond within 4 business hours.',
        data: saved
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to submit quote request.' });
    }
  },

  async getQuoteRequests(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.query;
      const quotes = email
        ? await db.getQuotesByEmail(String(email))
        : await db.getQuotes();

      res.status(200).json({
        success: true,
        count: quotes.length,
        data: quotes
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to fetch quote requests.' });
    }
  }
};

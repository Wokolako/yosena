import type { GemCategory } from '../types';

/*
 * The wholesale estimate formula. Imported by the calculator (for the live figure)
 * and by the quote API (which stores the estimate it computes itself), so the number
 * a jeweller sees is the number the trade desk receives.
 */

export const CLARITY_TIERS = ['Investment Grade (FL/VVS)', 'Commercial Fine (VS)', 'Atelier Standard (SI1)'] as const;
export type ClarityTier = (typeof CLARITY_TIERS)[number];

export const BASE_RATE_PER_CARAT: Record<GemCategory, number> = {
  Diamond: 42000,
  Sapphire: 12000,
  Emerald: 24000,
  Ruby: 65000,
  Spinel: 14000,
  Tourmaline: 38000,
};

const CLARITY_MULTIPLIER: Record<ClarityTier, number> = {
  'Investment Grade (FL/VVS)': 1.45,
  'Commercial Fine (VS)': 1.0,
  'Atelier Standard (SI1)': 0.72,
};

export function estimateQuote(input: { gemType: GemCategory; caratSize: number; clarityTier: ClarityTier; quantity: number }) {
  const base = BASE_RATE_PER_CARAT[input.gemType] ?? 0;
  const perCarat = Math.round(base * (CLARITY_MULTIPLIER[input.clarityTier] ?? 1) * (input.caratSize > 5 ? 1.6 : 1.0));
  return {
    perCarat,
    unitPrice: Math.round(perCarat * input.caratSize),
    total: Math.round(perCarat * input.caratSize * input.quantity),
  };
}

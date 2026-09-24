'use client';

import React, { useEffect, useState } from 'react';
import { GemCategory } from '../types';
import { calculateQuote, submitQuote, QuoteCalculation } from '../lib/api';
import { Calculator, Check, ArrowRight, Shield } from 'lucide-react';

export const WholesaleQuoteCalculator: React.FC = () => {
  const [gemType, setGemType] = useState<GemCategory>('Diamond');
  const [shape, setShape] = useState<string>('Emerald Cut');
  const [caratSize, setCaratSize] = useState<number>(3.5);
  const [clarityTier, setClarityTier] = useState<'Investment Grade (FL/VVS)' | 'Commercial Fine (VS)' | 'Atelier Standard (SI1)'>('Investment Grade (FL/VVS)');
  const [quantity, setQuantity] = useState<number>(1);
  const [originPreference, setOriginPreference] = useState<string>('Ethical Certified Co-op');
  const [submitted, setSubmitted] = useState<boolean>(false);
  const [contactEmail, setContactEmail] = useState<string>('');
  const [jewellerBusiness, setJewellerBusiness] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [quote, setQuote] = useState<QuoteCalculation | null>(null);
  const [isPricing, setIsPricing] = useState<boolean>(true);

  // Pricing is a server concern: the rate card and volume breaks stay on the
  // trade desk rather than being shipped to every visitor's browser.
  // Debounced because the carat and quantity inputs fire on every keystroke.
  useEffect(() => {
    let cancelled = false;
    setIsPricing(true);

    const timer = window.setTimeout(() => {
      (async () => {
        try {
          const result = await calculateQuote({
            gemType,
            shape,
            caratMin: caratSize,
            caratMax: caratSize,
            quantity,
            certification: clarityTier,
          });
          if (!cancelled) {
            setQuote(result);
            setSubmitError(null);
          }
        } catch (err: any) {
          if (!cancelled) setSubmitError(err?.message ?? 'Could not price this configuration.');
        } finally {
          if (!cancelled) setIsPricing(false);
        }
      })();
    }, 300);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [gemType, shape, caratSize, quantity, clarityTier]);

  const estimatedPerCarat = quote?.estimatedUnitPriceUSD ?? 0;
  const estimatedTotal = quote?.estimatedTotalUSD ?? 0;

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      await submitQuote({
        gemType,
        shape,
        caratMin: caratSize,
        caratMax: caratSize,
        targetBudget: estimatedTotal,
        quantity,
        certificationPreference: clarityTier,
        jewellerBusiness,
        contactEmail,
        notes: `Origin preference: ${originPreference}`,
      });
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message ?? 'The allocation request could not be registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="py-12 lg:py-20 bg-[#FAF8F5] dark:bg-[#0F0E0D] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-2">
          <span className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8C827A] dark:text-[#A69C94] font-bold">
            B2B Atelier Financial Desk
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">
            Wholesale Parcel &amp; Custom Sourcing Quote
          </h1>
          <p className="text-sm sm:text-base text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed">
            Calculate instant estimated trade valuations for single bespoke commission stones or calibrated parcel layouts. Generate formal GIA memo paperwork in real time.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* Left Form: Parameter Selectors */}
          <div className="lg:col-span-7 bg-[#FFFFFF] dark:bg-[#181614] p-6 sm:p-8 rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm space-y-6">
            <h3 className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold text-[#1A1918] dark:text-[#F5F2ED] pb-3 border-b border-[#F2ECE4] dark:border-[#262320] flex items-center gap-2">
              <Calculator className="w-4 h-4 text-[#C5A880]" />
              <span>Configure Sourcing Specifications</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Gem Type */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1.5 font-semibold">
                  Gemstone Variety
                </label>
                <select
                  value={gemType}
                  onChange={(e) => setGemType(e.target.value as GemCategory)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880] font-medium"
                >
                  <option value="Diamond">Investment Diamond (Type IIa / Fancy)</option>
                  <option value="Sapphire">Ceylon / Kashmir Sapphire (Unheated)</option>
                  <option value="Emerald">Colombian Muzo Emerald (Minor/No Oil)</option>
                  <option value="Ruby">Burmese / Mozambique Pigeon Blood Ruby</option>
                  <option value="Spinel">Cobalt Blue / Mahenge Spinel</option>
                  <option value="Tourmaline">Paraiba Neon Tourmaline (Batalha)</option>
                </select>
              </div>

              {/* Shape */}
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1.5 font-semibold">
                  Cut Profile
                </label>
                <select
                  value={shape}
                  onChange={(e) => setShape(e.target.value)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880] font-medium"
                >
                  <option value="Emerald Cut">Emerald Cut (Step Facet)</option>
                  <option value="Cushion">Antique / Modified Cushion</option>
                  <option value="Oval">Oval Brilliant</option>
                  <option value="Pear">Pear Shape</option>
                  <option value="Round Brilliant">Round Brilliant (Ideal Hearts &amp; Arrows)</option>
                  <option value="Asscher">Royal Asscher Cut</option>
                </select>
              </div>
            </div>

            {/* Carat Slider */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] font-semibold">
                  Target Carat Weight (Per Stone)
                </label>
                <span className="font-serif text-lg font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                  {caratSize} ct
                </span>
              </div>
              <input
                type="range"
                min="0.75"
                max="15.0"
                step="0.25"
                value={caratSize}
                onChange={(e) => setCaratSize(parseFloat(e.target.value))}
                className="w-full accent-[#1A1918] dark:accent-[#C5A880] cursor-pointer h-2 bg-[#E0D8CE] dark:bg-[#2C2926] rounded-lg"
              />
              <div className="flex justify-between text-xs text-[#8C827A] dark:text-[#A69C94] mt-1.5 font-medium">
                <span>0.75ct (Accent)</span>
                <span>5.0ct (Solitaire)</span>
                <span>15.0ct (Museum Investment)</span>
              </div>
            </div>

            {/* Clarity Tier & Quantity */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1.5 font-semibold">
                  Clarity &amp; Purity Tier
                </label>
                <select
                  value={clarityTier}
                  onChange={(e) => setClarityTier(e.target.value as any)}
                  className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none font-medium"
                >
                  <option value="Investment Grade (FL/VVS)">Investment Grade (FL / IF / VVS1)</option>
                  <option value="Commercial Fine (VS)">Commercial Fine (VS1 / VS2 Eye-Clean)</option>
                  <option value="Atelier Standard (SI1)">Atelier Standard (SI1 Selected)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1.5 font-semibold">
                  Quantity / Matching Parcel Units
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none font-medium"
                />
              </div>
            </div>

            {/* Origin & Provenance */}
            <div>
              <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1.5 font-semibold">
                Origin &amp; Ethical Guarantee
              </label>
              <select
                value={originPreference}
                onChange={(e) => setOriginPreference(e.target.value)}
                className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none font-medium"
              >
                <option value="Ethical Certified Co-op">Verified Artisanal Co-op (Sri Lanka / Colombia / Canada)</option>
                <option value="Historical European Estate">Single-Owner Historical European Estate Vault</option>
                <option value="Argyle Legacy Stock">Argyle Legacy Vault Stock (Certified Pink Diamonds)</option>
              </select>
            </div>
          </div>

          {/* Right Summary: Live Valuation Card */}
          <div className="lg:col-span-5 bg-[#141413] dark:bg-[#0A0908] text-[#FAF8F5] p-6 sm:p-8 rounded-xl border border-[#2E2C2A] dark:border-[#22201D] shadow-2xl space-y-6">
            <div className="flex items-center justify-between pb-3 border-b border-[#2C2B29]">
              <span className="text-xs uppercase tracking-[0.25em] text-[#C5A880] font-bold">
                Live Wholesale Estimate
              </span>
              <span className="text-xs text-[#A8A29E] font-medium">Currency: USD ($)</span>
            </div>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-[#262523]">
                <span className="text-[#A8A29E]">Selected Profile:</span>
                <span className="font-bold text-[#FAF8F5] text-right">{caratSize}ct {shape} {gemType}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#262523]">
                <span className="text-[#A8A29E]">Clarity Standard:</span>
                <span className="font-bold text-[#FAF8F5]">{clarityTier.split('(')[0]}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#262523]">
                <span className="text-[#A8A29E]">Batch Quantity:</span>
                <span className="font-bold text-[#FAF8F5]">{quantity} {quantity > 1 ? 'pieces (Matched Layout)' : 'solitaire stone'}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#262523]">
                <span className="text-[#A8A29E]">Est. Rate per Carat:</span>
                <span className="font-bold text-[#C5A880]">
                  {isPricing ? 'Pricing…' : `$${estimatedPerCarat.toLocaleString()} / ct`}
                </span>
              </div>
            </div>

            {/* Total Valuation Block */}
            <div className="bg-[#1C1B19] dark:bg-[#121110] p-5 rounded-lg border border-[#3E3B38] space-y-1">
              <span className="text-xs uppercase tracking-wider text-[#A8A29E] block font-semibold">
                Estimated Trade Valuation (Gross Ex-VAT)
              </span>
              <div className="font-serif text-3xl sm:text-4xl text-[#FAF8F5] font-normal">
                {isPricing ? '—' : `$${estimatedTotal.toLocaleString()}`} <span className="text-sm font-sans text-[#C5A880] font-bold">USD</span>
              </div>
              <p className="text-xs text-[#999188] pt-1">
                Subject to final GIA/Gübelin weight certificates and 14-day approval memo review.
              </p>
            </div>

            {submitted ? (
              <div className="p-4 bg-[#1E3A20] border border-[#2E7D32] rounded-lg text-xs sm:text-sm space-y-1 text-[#E8F5E9]">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Check className="w-4 h-4 text-[#81C784]" /> Allocation Dossier Initiated
                </div>
                <p className="text-xs text-[#C8E6C9] font-light">
                  Our gemological desk has registered your specs. A senior specialist will follow up from <span className="underline font-semibold">consult@yosenamora.com</span> within 4 hours.
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  value={jewellerBusiness}
                  onChange={(e) => setJewellerBusiness(e.target.value)}
                  placeholder="Your atelier or trade business name..."
                  className="w-full bg-[#242321] border border-[#3E3B38] rounded px-4 py-3 text-xs sm:text-sm text-[#FAF8F5] placeholder-[#8C827A] focus:outline-none focus:border-[#C5A880]"
                />
                <input
                  type="email"
                  required
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Enter your jeweller atelier email..."
                  className="w-full bg-[#242321] border border-[#3E3B38] rounded px-4 py-3 text-xs sm:text-sm text-[#FAF8F5] placeholder-[#8C827A] focus:outline-none focus:border-[#C5A880]"
                />

                {submitError && (
                  <p role="alert" className="text-xs text-[#E0897F] font-semibold">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 bg-[#FAF8F5] text-[#141413] hover:bg-[#E2DDD6] rounded text-xs sm:text-sm uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? 'Registering…' : 'Request Formal Memo Dossier'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}

            <div className="flex items-center gap-2 text-xs text-[#A8A29E] justify-center">
              <Shield className="w-4 h-4 text-[#C5A880]" />
              <span>Full confidentiality guaranteed under bilateral NDA</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
};

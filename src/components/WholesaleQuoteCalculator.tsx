import React, { useState } from 'react';
import { GemCategory } from '../types';
import { useAuth } from '../context/AuthContext';
import { estimateQuote, ClarityTier } from '../lib/quotePricing';
import { CONTACT_EMAIL } from '../lib/contact';
import { Calculator, Check, ArrowRight, Shield, Loader2 } from 'lucide-react';

export const WholesaleQuoteCalculator: React.FC = () => {
  const [gemType, setGemType] = useState<GemCategory>('Diamond');
  const [shape, setShape] = useState<string>('Emerald Cut');
  const [caratSize, setCaratSize] = useState<number>(3.5);
  const [clarityTier, setClarityTier] = useState<ClarityTier>('Investment Grade (FL/VVS)');
  const [quantity, setQuantity] = useState<number>(1);
  const [originPreference, setOriginPreference] = useState<string>('Ethical Certified Co-op');
  const { user } = useAuth();
  const [submittedRef, setSubmittedRef] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState<string>(user?.companyName ?? '');
  const [contactEmail, setContactEmail] = useState<string>(user?.email ?? '');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Same formula the server uses when it records the request.
  const { perCarat: estimatedPerCarat, total: estimatedTotal } = estimateQuote({ gemType, caratSize, clarityTier, quantity });

  const handleQuoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gemType,
          shape,
          caratSize,
          clarityTier,
          quantity,
          originPreference,
          jewellerBusiness: businessName,
          contactEmail,
          notes,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setSubmitError(data?.error ?? 'Your request could not be sent. Please try again.');
        return;
      }
      setSubmittedRef(data.data.id);
    } catch {
      setSubmitError('Could not reach the trade desk. Check your connection and try again.');
    } finally {
      setSubmitting(false);
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
                <span className="font-bold text-[#C5A880]">${estimatedPerCarat.toLocaleString()} / ct</span>
              </div>
            </div>

            {/* Total Valuation Block */}
            <div className="bg-[#1C1B19] dark:bg-[#121110] p-5 rounded-lg border border-[#3E3B38] space-y-1">
              <span className="text-xs uppercase tracking-wider text-[#A8A29E] block font-semibold">
                Estimated Trade Valuation (Gross Ex-VAT)
              </span>
              <div className="font-serif text-3xl sm:text-4xl text-[#FAF8F5] font-normal">
                ${estimatedTotal.toLocaleString()} <span className="text-sm font-sans text-[#C5A880] font-bold">USD</span>
              </div>
              <p className="text-xs text-[#999188] pt-1">
                Subject to final GIA/Gübelin weight certificates and 14-day approval memo review.
              </p>
            </div>

            {submittedRef ? (
              <div className="p-4 bg-[#1E3A20] border border-[#2E7D32] rounded-lg text-xs sm:text-sm space-y-1 text-[#E8F5E9]">
                <div className="flex items-center gap-1.5 font-bold text-sm">
                  <Check className="w-4 h-4 text-[#81C784]" /> Request {submittedRef} Received
                </div>
                <p className="text-xs text-[#C8E6C9] font-light">
                  Our gemological desk has your specifications. A specialist will reply from <span className="underline font-semibold">{CONTACT_EMAIL}</span>.
                </p>
              </div>
            ) : (
              <form onSubmit={handleQuoteSubmit} className="space-y-3">
                <input
                  type="text"
                  required
                  maxLength={160}
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="Atelier / business name"
                  aria-label="Atelier or business name"
                  className="w-full bg-[#242321] border border-[#3E3B38] rounded px-4 py-3 text-xs sm:text-sm text-[#FAF8F5] placeholder-[#8C827A] focus:outline-none focus:border-[#C5A880]"
                />
                <input
                  type="email"
                  required
                  maxLength={254}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="Enter your jeweller atelier email..."
                  aria-label="Business email"
                  className="w-full bg-[#242321] border border-[#3E3B38] rounded px-4 py-3 text-xs sm:text-sm text-[#FAF8F5] placeholder-[#8C827A] focus:outline-none focus:border-[#C5A880]"
                />
                <textarea
                  rows={2}
                  maxLength={2000}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Anything else the desk should know (optional)"
                  aria-label="Notes"
                  className="w-full bg-[#242321] border border-[#3E3B38] rounded px-4 py-3 text-xs sm:text-sm text-[#FAF8F5] placeholder-[#8C827A] focus:outline-none focus:border-[#C5A880]"
                />
                {submitError && <p role="alert" className="text-xs text-[#F2B8A8] font-semibold">{submitError}</p>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3.5 bg-[#FAF8F5] text-[#141413] hover:bg-[#E2DDD6] rounded text-xs sm:text-sm uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg disabled:opacity-60"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  <span>Request Formal Memo Dossier</span>
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

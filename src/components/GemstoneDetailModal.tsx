import React, { useState, useEffect } from 'react';
import { Gemstone, isPurchasable } from '../types';
import { 
  X, 
  ShoppingBag, 
  Award, 
  FileText, 
  Maximize2, 
  Check, 
  Mail, 
  Truck,
  RotateCw
} from 'lucide-react';

interface GemstoneDetailModalProps {
  gemstone: Gemstone | null;
  onClose: () => void;
  onAddToCart: (stone: Gemstone) => void;
  isSaved: boolean;
  onToggleSave: (stoneId: string) => void;
}

export const GemstoneDetailModal: React.FC<GemstoneDetailModalProps> = ({
  gemstone,
  onClose,
  onAddToCart,
  isSaved,
  onToggleSave,
}) => {
  const [activeTab, setActiveTab] = useState<'specs' | 'certificate' | 'memo-terms'>('specs');
  const [zoomMacro, setZoomMacro] = useState<boolean>(false);
  const [rotationAngle, setRotationAngle] = useState<number>(0);
  const [addedSuccess, setAddedSuccess] = useState<boolean>(false);

  // Close on Escape and lock background scroll while the dossier is open.
  useEffect(() => {
    if (!gemstone) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [gemstone, onClose]);

  if (!gemstone) return null;

  const available = isPurchasable(gemstone);

  const handleAdd = () => {
    if (!available) return;
    onAddToCart(gemstone);
    setAddedSuccess(true);
    setTimeout(() => setAddedSuccess(false), 2000);
  };

  const handleRotate = () => {
    setRotationAngle((prev) => (prev + 90) % 360);
  };

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Gemstone dossier: ${gemstone.name}`}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200"
    >
      <div 
        className="bg-[#FAF8F5] dark:bg-[#121110] w-full max-w-4xl rounded-xl border border-[#D5CDC4] dark:border-[#2C2926] shadow-2xl overflow-hidden my-8 relative flex flex-col max-h-[90vh] transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#E8E1D9] dark:border-[#262320] flex items-center justify-between bg-[#FFFFFF] dark:bg-[#181614]">
          <div className="flex items-center gap-3">
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94]">
              Vault Reference #{gemstone.certNumber}
            </span>
            <span className="px-2.5 py-0.5 rounded bg-[#FAF8F5] dark:bg-[#23201D] border border-[#E0D8CE] dark:border-[#38332E] text-xs uppercase font-bold text-[#1A1918] dark:text-[#F5F2ED]">
              {gemstone.status}
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#57534E] dark:text-[#D5CDC4] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="overflow-y-auto p-6 space-y-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
            {/* Left Column: Visual Presentation with Macro & Rotation */}
            <div className="md:col-span-6 space-y-4">
              <div className="relative rounded-lg overflow-hidden border border-[#D5CDC4] dark:border-[#2A2724] bg-[#141413] h-[340px] flex items-center justify-center">
                <img
                  src={gemstone.image}
                  alt={gemstone.name}
                  style={{ transform: `rotate(${rotationAngle}deg) scale(${zoomMacro ? 1.6 : 1})` }}
                  className="w-full h-full object-cover transition-transform duration-500"
                />

                {/* Interactive Controls Overlay */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleRotate}
                      className="px-2.5 py-1 bg-[#1A1918]/80 hover:bg-[#1A1918] text-[#FAF8F5] rounded border border-[#3E3B38] flex items-center gap-1 text-xs uppercase tracking-wider font-semibold backdrop-blur cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" /> Rotate 90°
                    </button>
                    <button
                      onClick={() => setZoomMacro(!zoomMacro)}
                      className={`px-2.5 py-1 rounded border flex items-center gap-1 text-xs uppercase tracking-wider font-semibold backdrop-blur cursor-pointer ${
                        zoomMacro 
                          ? 'bg-[#C5A880] text-[#141413] font-bold border-[#C5A880]' 
                          : 'bg-[#1A1918]/80 hover:bg-[#1A1918] text-[#FAF8F5] border-[#3E3B38]'
                      }`}
                    >
                      <Maximize2 className="w-3.5 h-3.5" /> {zoomMacro ? '40x Active' : '40x Macro'}
                    </button>
                  </div>
                  <span className="bg-[#FAF8F5]/95 dark:bg-[#181614]/95 text-[#1A1918] dark:text-[#F5F2ED] px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider shadow-sm">
                    {gemstone.certification} Verified
                  </span>
                </div>
              </div>

              {/* Lab Certification Banner */}
              <div className="p-3.5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded flex items-center justify-between text-xs sm:text-sm">
                <div className="flex items-center gap-2.5">
                  <Award className="w-5 h-5 text-[#C5A880]" />
                  <div>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.certification} Laboratory Certificate</span>
                    <p className="text-xs text-[#78716C] dark:text-[#A69C94]">Dossier ID: {gemstone.certNumber}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setActiveTab('certificate')}
                  className="text-xs uppercase tracking-wider text-[#C5A880] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] underline font-bold cursor-pointer"
                >
                  Inspect Certificate
                </button>
              </div>
            </div>

            {/* Right Column: Key Details & Pricing */}
            <div className="md:col-span-6 flex flex-col justify-between space-y-6">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-[#8C827A] dark:text-[#A69C94] font-bold mb-1">
                  <span>{gemstone.category}</span>
                  <span>•</span>
                  <span>{gemstone.origin}</span>
                </div>
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1918] dark:text-[#F5F2ED] leading-tight font-normal">
                  {gemstone.name}
                </h2>
                <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4] font-light mt-2 leading-relaxed">
                  {gemstone.description}
                </p>

                {/* Price Display */}
                <div className="mt-6 p-4.5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="text-xs uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-bold">
                        Wholesale Atelier Valuation
                      </span>
                      <span className="font-serif text-3xl font-semibold text-[#1A1918] dark:text-[#F5F2ED]">
                        ${gemstone.priceUSD.toLocaleString()} USD
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-xs uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-semibold">
                        Unit Rate
                      </span>
                      <span className="text-sm font-semibold text-[#57534E] dark:text-[#D5CDC4]">
                        ${gemstone.pricePerCarat.toLocaleString()} / ct
                      </span>
                    </div>
                  </div>
                </div>

                {/* Quick Spec Highlights */}
                <div className="grid grid-cols-2 gap-2.5 mt-4 text-xs sm:text-sm">
                  <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded">
                    <span className="text-xs text-[#8C827A] dark:text-[#A69C94] uppercase block font-semibold">Carat Weight</span>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.carat} carats</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded">
                    <span className="text-xs text-[#8C827A] dark:text-[#A69C94] uppercase block font-semibold">Dimensions</span>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.dimensions}</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded">
                    <span className="text-xs text-[#8C827A] dark:text-[#A69C94] uppercase block font-semibold">Color Grade</span>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.color}</span>
                  </div>
                  <div className="p-2.5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded">
                    <span className="text-xs text-[#8C827A] dark:text-[#A69C94] uppercase block font-semibold">Clarity Grade</span>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.clarity}</span>
                  </div>
                </div>
              </div>

              {/* Call to Actions */}
              <div className="space-y-2.5 pt-2">
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={handleAdd}
                    disabled={!available}
                    className={`py-3.5 px-4 rounded text-xs sm:text-sm uppercase tracking-[0.15em] font-bold transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
                      addedSuccess
                        ? 'bg-[#2E7D32] text-white'
                        : 'bg-[#1A1918] dark:bg-[#F5F2ED] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] text-[#FAF8F5] dark:text-[#1A1918]'
                    }`}
                  >
                    {!available ? (
                      <>Not Available — {gemstone.status}</>
                    ) : addedSuccess ? (
                      <>
                        <Check className="w-4 h-4" /> Added to Order
                      </>
                    ) : (
                      <>
                        <ShoppingBag className="w-4 h-4" /> Add to Order / Memo
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => onToggleSave(gemstone.id)}
                    className={`py-3.5 px-4 rounded text-xs sm:text-sm uppercase tracking-[0.15em] font-bold border transition-all cursor-pointer ${
                      isSaved
                        ? 'border-[#C5A880] bg-[#C5A880]/15 text-[#8C6D44] dark:text-[#C5A880]'
                        : 'border-[#D5CDC4] dark:border-[#38332E] bg-[#FFFFFF] dark:bg-[#181614] text-[#1A1918] dark:text-[#F5F2ED] hover:border-[#1A1918] dark:hover:border-[#F5F2ED]'
                    }`}
                  >
                    {isSaved ? '★ Saved in Vault' : '☆ Save to Vault'}
                  </button>
                </div>

                <a
                  href={`mailto:consult@yosenamora.com?subject=Inquiry for Gemstone Reference ${gemstone.certNumber} (${gemstone.name})`}
                  className="w-full py-2.5 px-4 text-center text-xs sm:text-sm font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#D5CDC4] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] border border-dashed border-[#D5CDC4] dark:border-[#38332E] rounded flex items-center justify-center gap-2 transition-colors cursor-pointer"
                >
                  <Mail className="w-4 h-4 text-[#C5A880]" />
                  <span>Email Atelier Desk (consult@yosenamora.com)</span>
                </a>
              </div>
            </div>
          </div>

          {/* Tabbed In-Depth Information */}
          <div className="border-t border-[#E8E1D9] dark:border-[#262320] pt-6">
            <div className="flex border-b border-[#E8E1D9] dark:border-[#262320] space-x-6 text-xs sm:text-sm uppercase tracking-wider font-semibold">
              <button
                onClick={() => setActiveTab('specs')}
                className={`pb-3 relative cursor-pointer ${
                  activeTab === 'specs' ? 'text-[#1A1918] dark:text-[#F5F2ED] font-bold border-b-2 border-[#1A1918] dark:border-[#C5A880]' : 'text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
                }`}
              >
                Comprehensive Gemological Analysis
              </button>
              <button
                onClick={() => setActiveTab('certificate')}
                className={`pb-3 relative cursor-pointer ${
                  activeTab === 'certificate' ? 'text-[#1A1918] dark:text-[#F5F2ED] font-bold border-b-2 border-[#1A1918] dark:border-[#C5A880]' : 'text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
                }`}
              >
                {gemstone.certification} Official Dossier
              </button>
              <button
                onClick={() => setActiveTab('memo-terms')}
                className={`pb-3 relative cursor-pointer ${
                  activeTab === 'memo-terms' ? 'text-[#1A1918] dark:text-[#F5F2ED] font-bold border-b-2 border-[#1A1918] dark:border-[#C5A880]' : 'text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
                }`}
              >
                14-Day Memo &amp; Armored Dispatch
              </button>
            </div>

            {/* Tab 1: Specs */}
            {activeTab === 'specs' && (
              <div className="pt-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-xs sm:text-sm">
                <div className="space-y-3 bg-[#FFFFFF] dark:bg-[#181614] p-4.5 rounded border border-[#E8E1D9] dark:border-[#262320]">
                  <h4 className="font-serif text-base text-[#1A1918] dark:text-[#F5F2ED] font-semibold border-b border-[#F2ECE4] dark:border-[#262320] pb-2">
                    Physical &amp; Optical Properties
                  </h4>
                  <div className="flex justify-between py-1.5 border-b border-[#F5EFE8] dark:border-[#23201D]">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Shape &amp; Cutting Style:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.shape} Step / Brilliant Facets</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F5EFE8] dark:border-[#23201D]">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Exact Millimeters:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.dimensions}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F5EFE8] dark:border-[#23201D]">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Treatment Classification:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.treatment}</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Polish / Symmetry:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">Excellent / Excellent</span>
                  </div>
                </div>

                <div className="space-y-3 bg-[#FFFFFF] dark:bg-[#181614] p-4.5 rounded border border-[#E8E1D9] dark:border-[#262320]">
                  <h4 className="font-serif text-base text-[#1A1918] dark:text-[#F5F2ED] font-semibold border-b border-[#F2ECE4] dark:border-[#262320] pb-2">
                    Provenance &amp; Ethical Chain
                  </h4>
                  <div className="flex justify-between py-1.5 border-b border-[#F5EFE8] dark:border-[#23201D]">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Geographic Origin:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.origin}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F5EFE8] dark:border-[#23201D]">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Mine Integrity Protocol:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">OECD Due Diligence Compliant</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-[#F5EFE8] dark:border-[#23201D]">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Custody Ledger:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">Single-Owner Atelier Batch</span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Laser Inscription:</span>
                    <span className="font-semibold text-[#1A1918] dark:text-[#F5F2ED]">{gemstone.certNumber}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Certificate */}
            {activeTab === 'certificate' && (
              <div className="pt-6 bg-[#FFFFFF] dark:bg-[#181614] p-6 rounded border border-[#E8E1D9] dark:border-[#262320] space-y-4">
                <div className="flex items-center justify-between border-b border-[#E8E1D9] dark:border-[#262320] pb-4">
                  <div className="flex items-center gap-3">
                    <FileText className="w-6 h-6 text-[#C5A880]" />
                    <div>
                      <h4 className="font-serif text-base text-[#1A1918] dark:text-[#F5F2ED]">
                        Official Gemological Institute Monograph
                      </h4>
                      <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94]">
                        Accredited Laboratory: {gemstone.certification} • Registration: {gemstone.certNumber}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-[#2E7D32] bg-[#E8F5E9] dark:bg-[#1B3320] dark:text-[#81C784] px-3 py-1 rounded font-bold flex items-center gap-1">
                    <Check className="w-4 h-4" /> Database Authenticated
                  </span>
                </div>

                <div className="p-4 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E1D9] dark:border-[#262320] rounded font-mono text-xs sm:text-sm space-y-1.5 text-[#44403C] dark:text-[#D5CDC4]">
                  <p>CERTIFICATE NUMBER: {gemstone.certNumber}</p>
                  <p>SPECIES / VARIETY: Natural {gemstone.category}</p>
                  <p>WEIGHT: {gemstone.carat} ct</p>
                  <p>MEASUREMENTS: {gemstone.dimensions}</p>
                  <p>COLOR: {gemstone.color}</p>
                  <p>CLARITY: {gemstone.clarity}</p>
                  <p>ORIGIN OPINION: {gemstone.origin}</p>
                  <p>COMMENTS: No indications of heating or optical enhancement observed.</p>
                </div>

                <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] italic font-light">
                  A high-resolution sealed copy with holographic tamper seal is dispatched alongside the physical stone via armored courier.
                </p>
              </div>
            )}

            {/* Tab 3: Memo Terms */}
            {activeTab === 'memo-terms' && (
              <div className="pt-6 bg-[#FFFFFF] dark:bg-[#181614] p-6 rounded border border-[#E8E1D9] dark:border-[#262320] space-y-4 text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4]">
                <div className="flex items-center gap-3 text-[#1A1918] dark:text-[#F5F2ED]">
                  <Truck className="w-5 h-5 text-[#C5A880]" />
                  <h4 className="font-serif text-base font-semibold">
                    14-Day Atelier Consignment &amp; Armored Dispatch
                  </h4>
                </div>
                <p className="font-light leading-relaxed">
                  Verified independent jewellers can request this gemstone on a 14-calendar-day approval memo to present to private commission clients or fit against physical wax models.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E1D9] dark:border-[#262320] rounded">
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block mb-1">Fully Insured</span>
                    <span className="text-xs text-[#78716C] dark:text-[#A69C94]">100% underwriters coverage via Malca-Amit &amp; Ferrari.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E1D9] dark:border-[#262320] rounded">
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block mb-1">Zero Restocking Fee</span>
                    <span className="text-xs text-[#78716C] dark:text-[#A69C94]">Full credit refund if returned in sealed tamper box within 14 days.</span>
                  </div>
                  <div className="p-3.5 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E1D9] dark:border-[#262320] rounded">
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block mb-1">B2B Wire / Invoicing</span>
                    <span className="text-xs text-[#78716C] dark:text-[#A69C94]">Flexible settlement options including Net-30 for vetted partners.</span>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8E1D9] dark:border-[#262320] bg-[#FFFFFF] dark:bg-[#181614] flex items-center justify-between text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94]">
          <span>YosenaMora Atelier • London &amp; Genève</span>
          <button
            onClick={onClose}
            className="text-xs sm:text-sm uppercase tracking-wider text-[#1A1918] dark:text-[#F5F2ED] hover:text-[#C5A880] font-bold cursor-pointer"
          >
            Close Dossier
          </button>
        </div>

      </div>
    </div>
  );
};

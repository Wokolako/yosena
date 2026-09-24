'use client';

import React, { useEffect, useState } from 'react';
import { PolicyType } from '../types';
import { fetchPolicy, PolicyDocument } from '../lib/api';
import { X, FileText, Mail } from 'lucide-react';

interface PolicyModalProps {
  policyType: PolicyType | null;
  onClose: () => void;
}

export const PolicyModal: React.FC<PolicyModalProps> = ({ policyType, onClose }) => {
  const [policy, setPolicy] = useState<PolicyDocument | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Policies are long legal documents read on demand, so each is fetched when
  // its modal opens rather than shipped with the bundle.
  useEffect(() => {
    if (!policyType) {
      setPolicy(null);
      setError(null);
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const doc = await fetchPolicy(policyType);
        if (!cancelled) {
          setPolicy(doc);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setPolicy(null);
          setError(err?.message ?? 'This document could not be retrieved.');
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [policyType]);

  // Close on Escape and lock background scroll while the policy is open.
  useEffect(() => {
    if (!policyType) return;
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
  }, [policyType, onClose]);

  if (!policyType) return null;

  // Header and chrome render immediately; the body fills in when the fetch lands.
  const title = policy?.title ?? 'Policy Document';
  const subtitle = policy?.subtitle ?? 'Legal & Regulatory Compliance';
  const sections = policy?.sections ?? [];

  return (
    <div
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in"
    >
      <div 
        className="bg-[#FAF8F5] dark:bg-[#121110] w-full max-w-2xl rounded-xl border border-[#D5CDC4] dark:border-[#2C2926] shadow-2xl overflow-hidden my-8 relative max-h-[85vh] flex flex-col transition-colors"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E8E1D9] dark:border-[#262320] flex items-center justify-between bg-[#FFFFFF] dark:bg-[#181614]">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[#C5A880]" />
            <span className="text-xs uppercase font-bold tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94]">
              Legal Filing &amp; Compliance
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#57534E] dark:text-[#D5CDC4] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6">
          <div className="border-b border-[#E8E1D9] dark:border-[#262320] pb-4">
            <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1918] dark:text-[#F5F2ED]">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] mt-1 font-light">
              {subtitle}
            </p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#44403C] dark:text-[#D5CDC4] leading-relaxed font-light">
            {!policy && (
              <p
                role={error ? 'alert' : 'status'}
                className={error ? 'text-[#A3524A] dark:text-[#E0897F]' : 'text-[#8C827A] dark:text-[#A69C94]'}
              >
                {error ?? 'Retrieving filing…'}
              </p>
            )}

            {sections.map((section, idx) => (
              <div key={idx} className="space-y-2">
                <h3 className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED] font-semibold">
                  {section.heading}
                </h3>
                <p>{section.text}</p>
              </div>
            ))}
          </div>

          <div className="p-4 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg text-xs sm:text-sm space-y-2">
            <span className="text-xs uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-bold">
              Regulatory Queries &amp; Compliance Officer
            </span>
            <p className="text-[#57534E] dark:text-[#D5CDC4]">
              Direct contact regarding provenance, custom ATA Carnets, or legal governance:
            </p>
            <a
              href="mailto:consult@yosenamora.com"
              className="text-[#1A1918] dark:text-[#F5F2ED] font-bold hover:text-[#C5A880] dark:hover:text-[#C5A880] flex items-center gap-1.5 underline"
            >
              <Mail className="w-4 h-4 text-[#C5A880]" /> consult@yosenamora.com
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8E1D9] dark:border-[#262320] bg-[#FFFFFF] dark:bg-[#181614] flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs sm:text-sm uppercase tracking-wider font-bold rounded hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};

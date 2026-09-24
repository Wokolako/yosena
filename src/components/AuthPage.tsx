'use client';

import React from 'react';
import { SignIn } from '@clerk/nextjs';
import { PageView } from '../types';
import { ShieldCheck, Check } from 'lucide-react';

interface AuthPageProps {
  onNavigate: (page: PageView) => void;
}

const TRUST_POINTS = [
  'Reserve stones to your private vault across devices',
  '14-day memo consignment for verified trade accounts',
  'Allocation notices before stones reach the public catalog',
];

/**
 * One way in, for members and newcomers alike.
 *
 * There used to be separate sign-in and register pages, which made a visitor
 * decide which one they were before they could do anything. Clerk's own form
 * already carries the link between the two, so the site offers a single "Join
 * Us" entry and lets the form sort out whether the account exists.
 *
 * Credentials, verification and session handling are Clerk's; this page only
 * supplies the surrounding brand panel. Trade standing — member id, tier,
 * credit line — is provisioned against the account on first load of the vault,
 * not collected here.
 */
export const AuthPage: React.FC<AuthPageProps> = ({ onNavigate }) => {
  return (
    <div className="py-12 lg:py-20 bg-[#FAF8F5] dark:bg-[#0F0E0D] transition-colors">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">

          {/* Brand panel */}
          <div className="space-y-6 order-2 lg:order-1">
            <div className="space-y-2">
              <span className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8C827A] dark:text-[#A69C94] font-bold flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#C5A880]" />
                Trade Member Access
              </span>
              <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">
                Join Us
              </h1>
              <p className="text-sm sm:text-base text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed">
                Sign in to your vault, or open a trade account in the same place.
                Save stones, request memo consignments and receive allocation
                notices ahead of the public catalog.
              </p>
            </div>

            <ul className="space-y-3">
              {TRUST_POINTS.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-3 text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed"
                >
                  <span className="mt-0.5 w-5 h-5 rounded-full bg-[#FAF8F5] dark:bg-[#23201D] border border-[#C5A880] flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-[#C5A880]" />
                  </span>
                  {point}
                </li>
              ))}
            </ul>

            <div className="text-xs text-[#8C827A] dark:text-[#6E6760] font-light leading-relaxed border-t border-[#E8E1D9] dark:border-[#262320] pt-4">
              Trade verification and credit terms are set by our desk after
              registration. Reach us at{' '}
              <span className="font-semibold text-[#57534E] dark:text-[#A69C94]">
                consult@yosenamora.com
              </span>
              .
            </div>
          </div>

          {/* Clerk's form carries its own "no account yet — sign up" link, which
              is what lets a single entry serve both. routing="hash" keeps its
              multi-step flows inside this single-page app rather than pushing
              to /sign-in/* URLs. */}
          <div className="order-1 lg:order-2 flex justify-center">
            <SignIn routing="hash" signUpUrl="/sign-up" />
          </div>

        </div>
      </div>
    </div>
  );
};

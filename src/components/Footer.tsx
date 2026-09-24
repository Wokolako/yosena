import React from 'react';
import { PageView, PolicyType } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { 
  Mail, 
  Instagram, 
  Linkedin, 
  Facebook, 
  Twitter, 
  ArrowUpRight 
} from 'lucide-react';

interface FooterProps {
  onNavigate: (page: PageView) => void;
  onOpenPolicy: (policy: PolicyType) => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigate, onOpenPolicy }) => {
  // The admin view has always been gated where it renders; this only stops the
  // footer advertising a door the visitor cannot open.
  const { user } = useAuth();
  const isAdmin = user?.accountRole === 'admin';

  return (
    <footer className="bg-[#FAF8F5] dark:bg-[#070706] text-[#1A1918] dark:text-[#FAF8F5] border-t border-[#E8E1D9] dark:border-[#1F1E1C] pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Main Footer Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-12 pb-14 border-b border-[#E0D8CE] dark:border-[#1F1E1C]">
          
          {/* Brand & Ethical Sourcing Statement */}
          <div className="lg:col-span-5 space-y-5">
            <div>
              <span className="font-serif text-3xl sm:text-4xl tracking-[0.18em] block text-[#1A1918] dark:text-[#FAF8F5]">
                YOSENAMORA
              </span>
              <span className="font-sans text-xs tracking-[0.35em] text-[#8C6D44] dark:text-[#C5A880] uppercase mt-0.5 block font-medium">
                Gemstone Atelier
              </span>
            </div>

            {/* Sourcing Statement */}
            <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#A69C94] font-light leading-relaxed max-w-md">
              YosenaMora sources exclusively from verified ethical artisanal cooperatives and certified industrial extraction partners. Guaranteed untreated corundum, zero conflict financing, and direct primary allocation for independent fine jewellers.
            </p>

            {/* Direct Contact Email */}
            <div className="pt-2">
              <span className="text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] block mb-1 font-semibold">
                Direct Atelier Consultation &amp; Memo Desk
              </span>
              <a
                href="mailto:consult@yosenamora.com"
                className="font-serif text-xl text-[#1A1918] dark:text-[#FAF8F5] hover:text-[#8C6D44] dark:hover:text-[#C5A880] transition-colors flex items-center gap-2 group font-medium"
              >
                <Mail className="w-5 h-5 text-[#8C6D44] dark:text-[#C5A880]" />
                <span>consult@yosenamora.com</span>
                <ArrowUpRight className="w-4 h-4 text-[#78716C] group-hover:text-[#8C6D44] dark:group-hover:text-[#C5A880] transition-colors" />
              </a>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="lg:col-span-3 space-y-4">
            <span className="text-xs sm:text-sm uppercase tracking-[0.25em] text-[#8C6D44] dark:text-[#C5A880] font-bold block">
              Atelier Portals
            </span>
            <ul className="space-y-3 text-xs sm:text-sm text-[#57534E] dark:text-[#D6D3D1] font-medium">
              <li>
                <button
                  onClick={() => onNavigate('home')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Home &amp; Curation
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('shop')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Gemstone Catalog
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('bookings')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Book Private Vault Consultation
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('quote-calc')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  B2B Wholesale Parcel Calculator
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('blog')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  The YosenaMora Gazette (Journal)
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('story')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Our Story &amp; Ethics
                </button>
              </li>
              <li>
                <button
                  onClick={() => onNavigate('vault')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer"
                >
                  Jeweller Member Portal
                </button>
              </li>
              {isAdmin && (
                <li>
                  <button
                    onClick={() => onNavigate('admin')}
                    className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors cursor-pointer font-bold text-[#8C6D44] dark:text-[#C5A880]"
                  >
                    Trade Desk Admin Center
                  </button>
                </li>
              )}
            </ul>
          </div>

          {/* Legal Filing Menu */}
          <div className="lg:col-span-4 space-y-4">
            <span className="text-xs sm:text-sm uppercase tracking-[0.25em] text-[#8C6D44] dark:text-[#C5A880] font-bold block">
              Legal Filing &amp; Compliance
            </span>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm text-[#57534E] dark:text-[#A8A29E] font-medium">
              <li>
                <button
                  onClick={() => onOpenPolicy('ethical-sourcing')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] text-left transition-colors cursor-pointer"
                >
                  Ethical Sourcing &amp; QA
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('shipping-returns')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] text-left transition-colors cursor-pointer"
                >
                  Shipping, Delivery &amp; Returns
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('terms')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] text-left transition-colors cursor-pointer"
                >
                  Terms &amp; Conditions
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('privacy')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] text-left transition-colors cursor-pointer"
                >
                  Privacy Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('cookies')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] text-left transition-colors cursor-pointer"
                >
                  Cookie Policy
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('legal-notice')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] text-left transition-colors cursor-pointer"
                >
                  Legal Notice
                </button>
              </li>
              <li>
                <button
                  onClick={() => onOpenPolicy('accessibility')}
                  className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] text-left transition-colors cursor-pointer"
                >
                  Accessibility Statement
                </button>
              </li>
            </ul>

            <div className="pt-2 text-xs text-[#78716C] dark:text-[#A69C94] font-medium">
              Registered with London Diamond Bourse &amp; Swiss Gemmological Society (SGG).
            </div>
          </div>

        </div>

        {/* Bottom Bar: Copyright & Social Bar & Theme Toggle */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-4 text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94]">
          <p>
            &copy; {new Date().getFullYear()} YosenaMora Atelier Ltd. All rights reserved.
          </p>

          <div className="flex items-center gap-6">
            <ThemeToggle />

            {/* Social Bar */}
            <div className="flex items-center space-x-4 text-[#78716C] dark:text-[#A8A29E]">
              <a href="https://instagram.com" target="_blank" rel="noreferrer" className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors" title="Instagram">
                <Instagram className="w-4 h-4" />
              </a>
              <a href="https://linkedin.com" target="_blank" rel="noreferrer" className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors" title="LinkedIn">
                <Linkedin className="w-4 h-4" />
              </a>
              <a href="https://facebook.com" target="_blank" rel="noreferrer" className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors" title="Facebook">
                <Facebook className="w-4 h-4" />
              </a>
              <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-[#1A1918] dark:hover:text-[#FAF8F5] transition-colors" title="Twitter / X">
                <Twitter className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
};

'use client';

import React from 'react';
import { Show, UserButton } from '@clerk/nextjs';
import { PageView } from '../types';
import { ThemeToggle } from './ThemeToggle';
import { useAuth } from '../context/AuthContext';
import { 
  ShoppingBag, 
  User, 
  Info,
  LogOut,
  Menu,
  X
} from 'lucide-react';

interface NavbarProps {
  currentPage: PageView;
  setCurrentPage: (page: PageView) => void;
  cartCount: number;
  openCart: () => void;
  openSiteGuide: () => void;
  openVault: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  setCurrentPage,
  cartCount,
  openCart,
  openSiteGuide,
  openVault,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const { user, signOut } = useAuth();

  // Initials for the member avatar; the wordmark monogram stands in when signed out.
  const initials = user
    ? (user.clientName || user.companyName)
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0]?.toUpperCase() ?? '')
        .join('')
    : 'YM';

  // Full descriptive labels for the mobile dropdown menu
  const navLinks: { id: PageView; label: string; icon?: React.ReactNode }[] = [
    { id: 'home', label: 'Atelier Home' },
    { id: 'shop', label: 'Gemstones' },
    { id: 'bookings', label: 'Private Consultations' },
    { id: 'quote-calc', label: 'Wholesale Quotes' },
  ];

  const desktopNavLabels: Partial<Record<PageView, string>> = {
    home: 'Home',
    shop: 'Gemstones',
    bookings: 'Consultations',
    'quote-calc': 'Wholesale',
  };

  const handleNav = (page: PageView) => {
    setCurrentPage(page);
    setMobileMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <header className="sticky top-0 z-40 bg-[#FAF8F5]/95 dark:bg-[#0F0E0D]/95 backdrop-blur-md border-b border-[#EBE5DE] dark:border-[#262320] transition-colors">
      {/* Top micro announcement bar */}
      <div className="bg-[#1A1918] dark:bg-[#080707] text-[#FAF8F5] text-xs sm:text-sm py-2.5 sm:py-3 px-4 text-center font-sans tracking-wider flex items-center justify-center gap-3 border-b border-[#2C2926] dark:border-[#1A1816]">
        <span className="inline-block w-2 h-2 rounded-full bg-[#C5A880] animate-pulse"></span>
        <span className="font-medium">PRIVATE VAULT ACCESS: Unheated Ceylon Sapphires & Type IIa Diamonds Available on Memo</span>
        <span className="text-[#C5A880] hidden sm:inline">|</span>
        <button 
          onClick={openSiteGuide}
          id="nav-site-architecture-btn"
          className="text-[#C5A880] underline hover:text-[#FAF8F5] transition-colors cursor-pointer hidden sm:inline text-xs font-semibold"
        >
          View Site Features & Architecture Guide
        </button>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 lg:h-28">
          {/* Brand Logo */}
          <button
            id="brand-logo-btn"
            onClick={() => handleNav('home')}
            className="flex flex-col text-left group focus:outline-none shrink-0 cursor-pointer"
          >
            <span className="font-serif text-2xl sm:text-3xl lg:text-4xl font-normal tracking-[0.08em] sm:tracking-[0.1em] text-[#1A1918] dark:text-[#F5F2ED] group-hover:text-[#6E6760] dark:group-hover:text-[#D5CDC4] transition-colors whitespace-nowrap leading-none">
              YOSENAMORA
            </span>
            <span className="font-sans text-[11px] sm:text-[13px] tracking-[0.25em] sm:tracking-[0.35em] text-[#78716C] dark:text-[#A69C94] uppercase mt-1.5 whitespace-nowrap font-medium">
              Gemstone Atelier
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center space-x-7 xl:space-x-9 2xl:space-x-11">
            {navLinks.map((link) => {
              const isActive = currentPage === link.id;
              return (
                <button
                  key={link.id}
                  id={`nav-link-${link.id}`}
                  onClick={() => handleNav(link.id)}
                  title={link.label}
                  className={`text-sm lg:text-[0.9375rem] tracking-[0.1em] uppercase transition-all py-2.5 relative whitespace-nowrap cursor-pointer ${
                    isActive
                      ? 'text-[#1A1918] dark:text-[#F5F2ED] font-bold'
                      : 'text-[#57534E] dark:text-[#B5ADA4] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] font-medium'
                  }`}
                >
                  {desktopNavLabels[link.id] ?? link.label}
                  {isActive && (
                    <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#1A1918] dark:bg-[#C5A880]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Icons & Theme Toggle */}
          <div className="flex items-center space-x-3 sm:space-x-4 lg:space-x-5 shrink-0">
            {/* Theme Switcher Toggle */}
            <ThemeToggle variant="full" className="hidden sm:inline-flex" />
            <ThemeToggle variant="compact" className="sm:hidden" />

            {/* Guide button */}
            <button
              id="guide-inspect-btn"
              onClick={openSiteGuide}
              title="Inspect Site Architecture"
              className="hidden md:flex px-4 py-2.5 text-xs font-medium tracking-wider uppercase border border-[#D5CDC4] dark:border-[#383430] rounded bg-[#FAF8F5] dark:bg-[#181614] hover:border-[#1A1918] dark:hover:border-[#F5F2ED] text-[#57534E] dark:text-[#D5CDC4] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] transition-colors items-center gap-2 cursor-pointer"
            >
              <Info className="w-4 h-4 text-[#C5A880]" />
              <span>Guide</span>
            </button>

            {/* Member Portal / Vault */}
            <button
              id="member-portal-btn"
              onClick={openVault}
              title={user ? `${user.companyName} — Member Vault` : 'Join us — sign in or open a trade account'}
              className="p-2 text-[#57534E] dark:text-[#D5CDC4] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors relative flex items-center gap-2 cursor-pointer"
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-serif font-bold shadow-sm ${
                user
                  ? 'bg-[#1A1918] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1A1918] border-2 border-[#C5A880]'
                  : 'bg-[#1A1918] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1A1918]'
              }`}>
                {initials}
              </div>
              {user && (
                <span className="hidden xl:inline text-[13px] uppercase tracking-wider font-semibold whitespace-nowrap">
                  My Vault
                </span>
              )}
            </button>

            {/* Account controls. Clerk owns profile management and sign out;
                the avatar button above stays as the route into the vault. */}
            <Show when="signed-out">
              <button
                id="join-btn"
                onClick={openVault}
                className="hidden md:flex px-4 py-2.5 text-xs font-semibold tracking-wider uppercase rounded bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors items-center cursor-pointer whitespace-nowrap"
              >
                Join Us
              </button>
            </Show>

            <Show when="signed-in">
              <div className="hidden md:flex items-center pl-1">
                <UserButton
                  appearance={{ elements: { avatarBox: 'w-9 h-9' } }}
                  userProfileProps={{ appearance: { elements: { profileSection: 'font-sans' } } }}
                />
              </div>
            </Show>

            {/* Cart Button */}
            <button
              id="cart-drawer-trigger-btn"
              onClick={openCart}
              title="View Vault Order / Memo Cart"
              className="p-2 text-[#1A1918] dark:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors relative cursor-pointer"
            >
              <ShoppingBag className="w-6 h-6" />
              {cartCount > 0 && (
                <span className="absolute top-0.5 right-0.5 bg-[#1A1918] dark:bg-[#C5A880] text-[#FAF8F5] dark:text-[#1A1918] text-[11px] w-[18px] h-[18px] rounded-full flex items-center justify-center font-bold">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Mobile Menu Trigger */}
            <button
              id="mobile-menu-trigger"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 text-[#1A1918] dark:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-7 h-7" /> : <Menu className="w-7 h-7" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#EBE5DE] dark:border-[#262320] bg-[#FAF8F5] dark:bg-[#121110] px-4 pt-4 pb-6 space-y-3 shadow-xl">
          <div className="pb-2 border-b border-[#EBE5DE] dark:border-[#262320] flex items-center justify-between">
            <span className="text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] font-semibold">Appearance</span>
            <ThemeToggle variant="full" />
          </div>

          {navLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => handleNav(link.id)}
              className={`block w-full text-left px-3.5 py-3 text-sm font-semibold uppercase tracking-wider rounded-md transition-colors ${
                currentPage === link.id
                  ? 'bg-[#F2ECE4] dark:bg-[#26221F] text-[#1A1918] dark:text-[#F5F2ED]'
                  : 'text-[#57534E] dark:text-[#C4BCB3] hover:bg-[#F7F3EE] dark:hover:bg-[#1D1B18]'
              }`}
            >
              {link.label}
            </button>
          ))}
          {user && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                signOut();
              }}
              className="block w-full text-left px-3.5 py-3 text-sm font-semibold uppercase tracking-wider rounded-md text-[#57534E] dark:text-[#C4BCB3] hover:bg-[#F7F3EE] dark:hover:bg-[#1D1B18] transition-colors flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          )}

          <div className="pt-3 border-t border-[#EBE5DE] dark:border-[#262320] flex justify-between items-center px-3">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openVault();
              }}
              className="text-sm uppercase tracking-wider font-semibold text-[#1A1918] dark:text-[#F5F2ED] flex items-center gap-2 cursor-pointer"
            >
              <User className="w-4 h-4" /> {user ? 'Member Jeweller Area' : 'Join Us'}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                openSiteGuide();
              }}
              className="text-xs uppercase tracking-wider text-[#C5A880] underline font-bold cursor-pointer"
            >
              Site Features Guide
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

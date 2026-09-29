'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Gemstone, PageView, PolicyType, isPurchasable } from './types';
import { useAuth } from './context/AuthContext';
import { useSiteData } from './context/SiteDataContext';
import { Navbar } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import { DiamondsShowcase } from './components/DiamondsShowcase';
import { QualityPromise } from './components/QualityPromise';
import { ShopCatalog } from './components/ShopCatalog';
import { GemstoneDetailModal } from './components/GemstoneDetailModal';
import { BookingSection } from './components/BookingSection';
import { WholesaleQuoteCalculator } from './components/WholesaleQuoteCalculator';
import { MembersVault } from './components/MembersVault';
import { AuthPage } from './components/AuthPage';
import { BlogSection } from './components/BlogSection';
import { JournalCarousel } from './components/JournalCarousel';
import { StoryAndEthicsSection } from './components/StoryAndEthicsSection';
import { CartDrawer, CheckoutReturn } from './components/CartDrawer';
import { PolicyModal } from './components/PolicyModal';
import { SiteGuideModal } from './components/SiteGuideModal';
import { Footer } from './components/Footer';
import { ChatWidget } from './components/ChatWidget';

const CART_KEY = 'yosenamora_cart';
const SAVED_KEY = 'yosenamora_vault';

function readStoredIds(key: string): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(parsed)) return [];
    // Older carts stored whole stone objects; keep only the ids (prices always come from the server).
    return Array.from(
      new Set(parsed.map((x: any) => (typeof x === 'string' ? x : x?.gemstone?.id ?? x?.id)).filter((x: unknown) => typeof x === 'string'))
    );
  } catch {
    return [];
  }
}

function storeIds(key: string, ids: string[]) {
  try {
    if (ids.length) localStorage.setItem(key, JSON.stringify(ids));
    else localStorage.removeItem(key);
  } catch {
    // Ignore in restricted environments
  }
}

export default function App() {
  const { user, isRestoring, updateProfile } = useAuth();
  const { stones } = useSiteData();
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [selectedGemstone, setSelectedGemstone] = useState<Gemstone | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartIds, setCartIds] = useState<string[]>([]);
  const [guestSavedIds, setGuestSavedIds] = useState<string[]>([]);
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);
  const [isSiteGuideOpen, setIsSiteGuideOpen] = useState<boolean>(false);
  const [checkoutReturn, setCheckoutReturn] = useState<CheckoutReturn | null>(null);

  // Stone deep links, e.g. #stone=dia-1001 (used by the concierge).
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('stone=')) {
        const stoneId = hash.split('stone=')[1]?.split('&')[0];
        const found = stones.find((s) => s.id === stoneId);
        if (found) setSelectedGemstone(found);
      }
    };
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [stones]);

  // Restore the cart and guest bookmarks; pick up a return from the payment page or an order link.
  useEffect(() => {
    setCartIds(readStoredIds(CART_KEY));
    setGuestSavedIds(readStoredIds(SAVED_KEY));

    const params = new URLSearchParams(window.location.search);
    const reference = params.get('order');
    const token = params.get('t');
    if (reference && token) {
      const state = params.get('checkout');
      setCheckoutReturn({
        reference,
        token,
        outcome: state === 'success' ? 'success' : state === 'cancelled' ? 'cancelled' : 'view',
      });
      setIsCartOpen(true);
      // Remove the private order link from the address bar.
      window.history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  }, []);

  // A member's bookmarks live on their account; carry over anything saved before signing in.
  useEffect(() => {
    if (!user || guestSavedIds.length === 0) return;
    const merged = Array.from(new Set([...(user.savedStoneIds || []), ...guestSavedIds]));
    setGuestSavedIds([]);
    storeIds(SAVED_KEY, []);
    if (merged.length !== (user.savedStoneIds || []).length) void updateProfile({ savedStoneIds: merged });
  }, [user, guestSavedIds, updateProfile]);

  const savedStoneIds = user ? user.savedStoneIds || [] : guestSavedIds;

  const handleAddToCart = (stone: Gemstone) => {
    if (!isPurchasable(stone)) return;
    setCartIds((prev) => {
      if (prev.includes(stone.id)) return prev; // each stone is one of a kind
      const updated = [...prev, stone.id];
      storeIds(CART_KEY, updated);
      return updated;
    });
  };

  const handleRemoveFromCart = (stoneId: string) => {
    setCartIds((prev) => {
      const updated = prev.filter((id) => id !== stoneId);
      storeIds(CART_KEY, updated);
      return updated;
    });
  };

  const handleClearCart = useCallback(() => {
    setCartIds([]);
    storeIds(CART_KEY, []);
  }, []);

  const handleToggleSaveStone = (stoneId: string) => {
    const next = savedStoneIds.includes(stoneId)
      ? savedStoneIds.filter((id) => id !== stoneId)
      : [...savedStoneIds, stoneId];
    if (user) {
      void updateProfile({ savedStoneIds: next });
    } else {
      setGuestSavedIds(next);
      storeIds(SAVED_KEY, next);
    }
  };

  // Any in-page navigation also returns the viewer to the top — footer links in
  // particular are clicked from the very bottom of a long page.
  const handleNavigate = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const savedStonesList = stones.filter((s) => savedStoneIds.includes(s.id));

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1918] dark:text-[#F5F2ED] flex flex-col font-sans selection:bg-[#2C2A29] selection:text-[#FAF8F5] transition-colors duration-200">

      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        cartCount={cartIds.length}
        openCart={() => setIsCartOpen(true)}
        openSiteGuide={() => setIsSiteGuideOpen(true)}
        openVault={() => handleNavigate(user ? 'vault' : 'signin')}
      />

      {/* Main Routed Content */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <>
            {/* Section 1: Hero */}
            <HeroSection onNavigate={handleNavigate} />

            {/* Section 2 & 3: "yosenamora" & "All our diamonds, worth millions." & 3 Containers */}
            <DiamondsShowcase
              diamonds={stones}
              onSelectStone={(stone) => setSelectedGemstone(stone)}
              onNavigate={handleNavigate}
            />

            {/* Section 4: "Polished, clean, minted!" & Gemstone Macro */}
            <QualityPromise onNavigate={handleNavigate} />

            {/* Quick Sourcing Calculator Teaser */}
            <section className="py-16 bg-[#F5EFE8] dark:bg-[#181614] border-b border-[#E8E1D9] dark:border-[#2A2724] text-center px-4 transition-colors">
              <div className="max-w-4xl mx-auto space-y-4">
                <span className="text-xs uppercase tracking-[0.3em] text-[#8C827A] dark:text-[#A69B8F] font-bold">
                  B2B Jeweller Tools
                </span>
                <h3 className="font-serif text-3xl sm:text-4xl text-[#1A1918] dark:text-[#F5F2ED]">
                  Calculate Custom Wholesale Parcel Allocations
                </h3>
                <p className="text-sm sm:text-base text-[#57534E] dark:text-[#C4BCB3] max-w-xl mx-auto font-light leading-relaxed">
                  Need specific calibrated emerald cuts for an eternity band or an unheated Ceylon sapphire solitaire? Calculate real-time trade prices with our instant quote desk.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => handleNavigate('quote-calc')}
                    className="px-7 py-3 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded text-xs uppercase tracking-wider font-semibold hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors cursor-pointer shadow-md"
                  >
                    Open Wholesale Quote Calculator
                  </button>
                </div>
              </div>
            </section>

            {/* Journal Stories Carousel (Journal is no longer in the header nav) */}
            <JournalCarousel onNavigate={handleNavigate} />
          </>
        )}

        {currentPage === 'shop' && (
          <ShopCatalog
            gemstones={stones}
            onSelectStone={(stone) => setSelectedGemstone(stone)}
            onAddToCart={handleAddToCart}
            savedStoneIds={savedStoneIds}
            onToggleSave={handleToggleSaveStone}
          />
        )}

        {currentPage === 'bookings' && (
          <BookingSection />
        )}

        {currentPage === 'quote-calc' && (
          <WholesaleQuoteCalculator />
        )}

        {currentPage === 'vault' && (
          user ? (
            <MembersVault
              user={user}
              savedStones={savedStonesList}
              onSelectStone={(stone) => setSelectedGemstone(stone)}
              onRemoveSaved={handleToggleSaveStone}
              onNavigateShop={() => handleNavigate('shop')}
            />
          ) : (
            !isRestoring && <AuthPage mode="signin" onNavigate={handleNavigate} />
          )
        )}

        {currentPage === 'signin' && (
          <AuthPage mode="signin" onNavigate={handleNavigate} />
        )}

        {currentPage === 'signup' && (
          <AuthPage mode="signup" onNavigate={handleNavigate} />
        )}

        {currentPage === 'blog' && (
          <BlogSection />
        )}

        {currentPage === 'story' && (
          <StoryAndEthicsSection />
        )}
      </main>

      {/* Persistent Global Modals & Drawers */}
      <GemstoneDetailModal
        gemstone={selectedGemstone}
        onClose={() => setSelectedGemstone(null)}
        onAddToCart={handleAddToCart}
        isSaved={selectedGemstone ? savedStoneIds.includes(selectedGemstone.id) : false}
        onToggleSave={handleToggleSaveStone}
      />

      <CartDrawer
        isOpen={isCartOpen}
        onClose={() => {
          setIsCartOpen(false);
          setCheckoutReturn(null);
        }}
        cartIds={cartIds}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onSelectStone={(stone) => setSelectedGemstone(stone)}
        onNavigate={handleNavigate}
        checkoutReturn={checkoutReturn}
      />

      <PolicyModal
        policyType={activePolicy}
        onClose={() => setActivePolicy(null)}
      />

      <SiteGuideModal
        isOpen={isSiteGuideOpen}
        onClose={() => setIsSiteGuideOpen(false)}
      />

      {/* Floating AI Concierge */}
      <ChatWidget onSelectStone={(stone) => setSelectedGemstone(stone)} />

      {/* Global Footer */}
      <Footer
        onNavigate={handleNavigate}
        onOpenPolicy={(policy) => setActivePolicy(policy)}
      />

    </div>
  );
}

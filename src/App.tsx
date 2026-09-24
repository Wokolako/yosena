'use client';

import React, { useState, useEffect } from 'react';
import { Gemstone, CartItem, PageView, PolicyType } from './types';
import { fetchGemstones } from './lib/api';
import { useAuth } from './context/AuthContext';
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
import { CartDrawer } from './components/CartDrawer';
import { PolicyModal } from './components/PolicyModal';
import { SiteGuideModal } from './components/SiteGuideModal';
import { Footer } from './components/Footer';
import { ChatWidget } from './components/ChatWidget';

import { AdminDashboard } from './components/AdminDashboard';

/**
 * Stand-in for the catalog while it loads or when the trade desk is unreachable.
 * Holds the same vertical space as a populated grid so the page does not jump.
 */
const CatalogStatus: React.FC<{ message: string; isError?: boolean }> = ({ message, isError }) => (
  <div className="py-32 px-4 text-center">
    <p
      className={`text-sm sm:text-base font-light tracking-wide ${
        isError ? 'text-[#A3524A] dark:text-[#E0897F]' : 'text-[#8C827A] dark:text-[#A69C94]'
      }`}
      role={isError ? 'alert' : 'status'}
    >
      {message}
    </p>
  </div>
);

export default function App() {
  const { user, isRestoring } = useAuth();
  const [currentPage, setCurrentPage] = useState<PageView>('home');
  const [selectedGemstone, setSelectedGemstone] = useState<Gemstone | null>(null);
  const [isCartOpen, setIsCartOpen] = useState<boolean>(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [gemstones, setGemstones] = useState<Gemstone[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [savedStoneIds, setSavedStoneIds] = useState<string[]>([]);
  const [activePolicy, setActivePolicy] = useState<PolicyType | null>(null);
  const [isSiteGuideOpen, setIsSiteGuideOpen] = useState<boolean>(false);

  // The catalog is the one dataset the whole page tree reads, so it is loaded
  // once here and passed down rather than re-fetched per section.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const stones = await fetchGemstones();
        if (!cancelled) {
          setGemstones(stones);
          setCatalogError(null);
        }
      } catch (err: any) {
        if (!cancelled) setCatalogError(err?.message ?? 'Could not load the vault catalog.');
      } finally {
        if (!cancelled) setIsLoadingCatalog(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // Check hash for stone deep links e.g. #stone=dia-1001 or #admin.
  // Depends on `gemstones` so a link opened before the catalog arrives still
  // resolves once it does.
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash === '#admin') {
        setCurrentPage('admin');
      } else if (hash.includes('stone=')) {
        const stoneId = hash.split('stone=')[1]?.split('&')[0];
        const found = gemstones.find((s) => s.id === stoneId);
        if (found) {
          setSelectedGemstone(found);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [gemstones]);

  // Load / save cart from localStorage
  useEffect(() => {
    try {
      const savedCart = localStorage.getItem('yosenamora_cart');
      if (savedCart) {
        setCartItems(JSON.parse(savedCart));
      }
      const savedVault = localStorage.getItem('yosenamora_vault');
      if (savedVault) {
        setSavedStoneIds(JSON.parse(savedVault));
      }
    } catch (e) {
      // Ignore in iframe restricted environments
    }
  }, []);

  // A signed-in member's vault lives on their account record, so it wins over
  // whatever this browser happened to have saved anonymously.
  useEffect(() => {
    if (user?.savedStoneIds) {
      setSavedStoneIds(user.savedStoneIds);
    }
  }, [user]);

  const handleAddToCart = (stone: Gemstone) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.gemstone.id === stone.id);
      let updated: CartItem[];
      if (existing) {
        updated = prev.map((item) =>
          item.gemstone.id === stone.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      } else {
        updated = [...prev, { gemstone: stone, quantity: 1, addedAt: new Date().toISOString() }];
      }
      try {
        localStorage.setItem('yosenamora_cart', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleRemoveFromCart = (stoneId: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.gemstone.id !== stoneId);
      try {
        localStorage.setItem('yosenamora_cart', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  const handleClearCart = () => {
    setCartItems([]);
    try {
      localStorage.removeItem('yosenamora_cart');
    } catch (e) {}
  };

  const handleToggleSaveStone = (stoneId: string) => {
    setSavedStoneIds((prev) => {
      const updated = prev.includes(stoneId)
        ? prev.filter((id) => id !== stoneId)
        : [...prev, stoneId];
      try {
        localStorage.setItem('yosenamora_vault', JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  };

  // Any in-page navigation also returns the viewer to the top — footer links in
  // particular are clicked from the very bottom of a long page.
  const handleNavigate = (page: PageView) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const savedStonesList = gemstones.filter((s) => savedStoneIds.includes(s.id));

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1918] dark:text-[#F5F2ED] flex flex-col font-sans selection:bg-[#2C2A29] selection:text-[#FAF8F5] transition-colors duration-200">
      
      {/* Top Navigation */}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)}
        openCart={() => setIsCartOpen(true)}
        openSiteGuide={() => setIsSiteGuideOpen(true)}
        openVault={() => handleNavigate(user ? 'vault' : 'join')}
      />

      {/* Main Routed Content */}
      <main className="flex-1">
        {currentPage === 'home' && (
          <>
            {/* Section 1: Hero */}
            <HeroSection onNavigate={handleNavigate} />

            {/* Section 2 & 3: "yosenamora" & "All our diamonds, worth millions." & 3 Containers */}
            <DiamondsShowcase
              diamonds={gemstones}
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
          isLoadingCatalog ? (
            <CatalogStatus message="Opening the vault…" />
          ) : catalogError ? (
            <CatalogStatus message={catalogError} isError />
          ) : (
            <ShopCatalog
              gemstones={gemstones}
              onSelectStone={(stone) => setSelectedGemstone(stone)}
              onAddToCart={handleAddToCart}
              savedStoneIds={savedStoneIds}
              onToggleSave={handleToggleSaveStone}
            />
          )
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
            // Session may still be restoring from a stored token — hold rather than
            // flashing the sign-in form at a member who is already signed in.
            !isRestoring && <AuthPage onNavigate={handleNavigate} />
          )
        )}

        {currentPage === 'join' && <AuthPage onNavigate={handleNavigate} />}

        {currentPage === 'blog' && (
          <BlogSection />
        )}

        {currentPage === 'story' && (
          <StoryAndEthicsSection />
        )}

        {currentPage === 'admin' && (
          // The trade desk is gated on the account_role column, not on having a
          // Clerk session — every /api/admin route re-checks it server-side, so
          // this only decides what is worth rendering.
          isRestoring ? (
            <CatalogStatus message="Checking your access…" />
          ) : !user ? (
            <AuthPage onNavigate={handleNavigate} />
          ) : user.accountRole !== 'admin' ? (
            <CatalogStatus
              message="This area is restricted to trade desk administrators."
              isError
            />
          ) : (
            <AdminDashboard
              onNavigate={handleNavigate}
              onSelectStone={(stone) => setSelectedGemstone(stone)}
            />
          )
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
        onClose={() => setIsCartOpen(false)}
        cartItems={cartItems}
        onRemoveItem={handleRemoveFromCart}
        onClearCart={handleClearCart}
        onSelectStone={(stone) => setSelectedGemstone(stone)}
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

'use client';

import React, { useEffect, useState } from 'react';
import { Gemstone } from '../types';
import { AuthUser } from '../context/AuthContext';
import { fetchMemos, Memo } from '../lib/api';
import { 
  ShieldCheck, 
  FileText, 
  Clock, 
  Bell, 
  Star, 
  Trash2, 
  Eye
} from 'lucide-react';

interface MembersVaultProps {
  user: AuthUser;
  savedStones: Gemstone[];
  onSelectStone: (stone: Gemstone) => void;
  onRemoveSaved: (stoneId: string) => void;
  onNavigateShop: () => void;
}

export const MembersVault: React.FC<MembersVaultProps> = ({
  user,
  savedStones,
  onSelectStone,
  onRemoveSaved,
  onNavigateShop,
}) => {
  const [activeTab, setActiveTab] = useState<'vault' | 'memos' | 'settings'>('vault');
  const [notifyDrops, setNotifyDrops] = useState(user.preferences.notifyDrops);
  const [notifyMemos, setNotifyMemos] = useState(user.preferences.notifyMemos);
  const [memos, setMemos] = useState<Memo[]>([]);
  const [isLoadingMemos, setIsLoadingMemos] = useState<boolean>(true);
  const [memoError, setMemoError] = useState<string | null>(null);

  // The API scopes this to the bearer token, so it returns only this member's
  // consignments — re-fetched if the signed-in account changes.
  useEffect(() => {
    let cancelled = false;
    setIsLoadingMemos(true);

    (async () => {
      try {
        const data = await fetchMemos();
        if (!cancelled) {
          setMemos(data);
          setMemoError(null);
        }
      } catch (err: any) {
        if (!cancelled) setMemoError(err?.message ?? 'Could not load your consignment memos.');
      } finally {
        if (!cancelled) setIsLoadingMemos(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user.id]);

  // Initials from the account holder's name, falling back to the company.
  const initials = (user.clientName || user.companyName)
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');

  const creditLine = user.creditLineUSD.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

  const usd = (value: number) =>
    value.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="py-12 lg:py-20 bg-[#FAF8F5] dark:bg-[#0F0E0D] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Jeweller Member Profile Banner */}
        <div className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl p-6 sm:p-8 mb-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1A1918] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1A1918] flex items-center justify-center font-serif text-2xl font-bold border-2 border-[#C5A880] shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1918] dark:text-[#F5F2ED]">{user.companyName}</h2>
                {user.isVerifiedTrade && (
                  <span className="bg-[#FAF8F5] dark:bg-[#23201D] border border-[#C5A880] text-[#8C6D44] dark:text-[#C5A880] text-xs uppercase font-bold tracking-wider px-2.5 py-0.5 rounded flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4 text-[#C5A880]" /> Verified Trade Partner
                  </span>
                )}
              </div>
              <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] mt-1 font-medium">
                Member ID: {user.memberId} • Account Lead: {user.clientName}, {user.tier}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="bg-[#FAF8F5] dark:bg-[#121110] p-3.5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] text-xs sm:text-sm text-right hidden sm:block">
              <span className="text-xs uppercase text-[#8C827A] dark:text-[#A69C94] block font-bold">Approved Memo Credit Line</span>
              <span className="font-serif text-lg font-bold text-[#1A1918] dark:text-[#F5F2ED]">{creditLine} USD</span>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E8E1D9] dark:border-[#262320] mb-8 gap-6 sm:gap-8 text-xs sm:text-sm uppercase tracking-wider font-bold overflow-x-auto">
          <button
            onClick={() => setActiveTab('vault')}
            className={`pb-3 relative flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'vault' ? 'text-[#1A1918] dark:text-[#F5F2ED] border-b-2 border-[#1A1918] dark:border-[#C5A880]' : 'text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            <Star className="w-4 h-4 text-[#C5A880]" />
            <span>Saved Atelier Stones ({savedStones.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('memos')}
            className={`pb-3 relative flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'memos' ? 'text-[#1A1918] dark:text-[#F5F2ED] border-b-2 border-[#1A1918] dark:border-[#C5A880]' : 'text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            <FileText className="w-4 h-4 text-[#C5A880]" />
            <span>Active Consignment Memos ({memos.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('settings')}
            className={`pb-3 relative flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
              activeTab === 'settings' ? 'text-[#1A1918] dark:text-[#F5F2ED] border-b-2 border-[#1A1918] dark:border-[#C5A880]' : 'text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
            }`}
          >
            <Bell className="w-4 h-4 text-[#C5A880]" />
            <span>Notifications &amp; Preferences</span>
          </button>
        </div>

        {/* Tab Content 1: Saved Stones */}
        {activeTab === 'vault' && (
          <div>
            {savedStones.length === 0 ? (
              <div className="text-center py-20 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl p-8 space-y-4">
                <Star className="w-10 h-10 text-[#C5A880] mx-auto opacity-70" />
                <h3 className="font-serif text-2xl sm:text-3xl text-[#1A1918] dark:text-[#F5F2ED]">Your Atelier Vault is Empty</h3>
                <p className="text-sm text-[#78716C] dark:text-[#A69C94] max-w-md mx-auto font-light leading-relaxed">
                  Bookmark gemstones while browsing our catalog to easily compare carat weights, origins, and GIA certificates with your private bespoke clients.
                </p>
                <button
                  onClick={onNavigateShop}
                  className="px-7 py-3.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded text-xs sm:text-sm uppercase tracking-wider font-bold hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors cursor-pointer"
                >
                  Browse Gemstone Catalog
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {savedStones.map((stone) => (
                  <div
                    key={stone.id}
                    className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg overflow-hidden hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="relative h-48 bg-[#1A1918] cursor-pointer" onClick={() => onSelectStone(stone)}>
                      <img src={stone.image} alt={stone.name} className="w-full h-full object-cover" />
                      <div className="absolute top-2.5 left-2.5 bg-[#FAF8F5]/95 dark:bg-[#121110]/95 px-2.5 py-1 rounded text-xs font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                        {stone.shape} • {stone.carat}ct
                      </div>
                      <div className="absolute top-2.5 right-2.5 bg-[#1A1918] dark:bg-[#C5A880] text-[#FAF8F5] dark:text-[#141413] px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider">
                        {stone.certification}
                      </div>
                    </div>

                    <div className="p-5 space-y-2">
                      <span className="text-xs uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-semibold">
                        {stone.origin}
                      </span>
                      <h4 
                        onClick={() => onSelectStone(stone)}
                        className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED] hover:text-[#57534E] dark:hover:text-[#C5A880] cursor-pointer line-clamp-1 font-semibold"
                      >
                        {stone.name}
                      </h4>
                      <p className="text-sm font-serif text-[#1A1918] dark:text-[#F5F2ED] font-semibold">
                        ${stone.priceUSD.toLocaleString()} USD (${stone.pricePerCarat.toLocaleString()}/ct)
                      </p>
                    </div>

                    <div className="p-4 pt-3 border-t border-[#F2ECE4] dark:border-[#262320] flex items-center justify-between">
                      <button
                        onClick={() => onSelectStone(stone)}
                        className="text-xs uppercase tracking-wider text-[#1A1918] dark:text-[#F5F2ED] hover:text-[#C5A880] font-bold flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-4 h-4 text-[#C5A880]" /> Inspect Dossier
                      </button>
                      <button
                        onClick={() => onRemoveSaved(stone.id)}
                        className="text-xs text-[#DC2626] dark:text-[#EF4444] hover:underline flex items-center gap-1 cursor-pointer font-bold"
                        title="Remove from vault"
                      >
                        <Trash2 className="w-4 h-4" /> Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab Content 2: Active Memos */}
        {activeTab === 'memos' && (
          <div className="space-y-4">
            {(isLoadingMemos || memoError) && (
              <p
                role={memoError ? 'alert' : 'status'}
                className={`text-xs sm:text-sm font-light py-6 ${
                  memoError ? 'text-[#A3524A] dark:text-[#E0897F]' : 'text-[#8C827A] dark:text-[#A69C94]'
                }`}
              >
                {memoError ?? 'Retrieving your consignments…'}
              </p>
            )}

            {!isLoadingMemos && !memoError && memos.length === 0 && (
              <p className="text-xs sm:text-sm font-light py-6 text-[#8C827A] dark:text-[#A69C94]">
                You have no consignment memos out at the moment.
              </p>
            )}

            {memos.map((memo) => (
              <div
                key={memo.id}
                className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs sm:text-sm font-bold text-[#1A1918] dark:text-[#F5F2ED]">{memo.id}</span>
                    <span className="bg-[#FEF3C7] dark:bg-[#3D2E0F] text-[#92400E] dark:text-[#FDE68A] px-2.5 py-0.5 rounded text-xs uppercase font-bold tracking-wider">
                      {memo.status}
                    </span>
                  </div>
                  <h4 className="font-serif text-xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">{memo.stoneName}</h4>
                  <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] pt-1">
                    <span>Courier: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{memo.courier}</strong></span>
                    <span>Tracking: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{memo.tracking}</strong></span>
                    <span>Declared Value: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{usd(memo.declaredValueUSD)}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#F2ECE4] dark:border-[#262320]">
                  <div className="text-right">
                    <span className="text-xs uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-bold">Inspection Window</span>
                    <span className="text-xs sm:text-sm font-bold text-[#DC2626] dark:text-[#EF4444] flex items-center gap-1 justify-end">
                      <Clock className="w-4 h-4" /> {memo.daysRemaining} Days Left
                    </span>
                  </div>
                  <a
                    href={`mailto:consult@yosenamora.com?subject=${encodeURIComponent(`Settlement for Memo ${memo.id}`)}`}
                    className="px-5 py-2.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs sm:text-sm uppercase tracking-wider font-bold rounded hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    Confirm Purchase / Return
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab Content 3: Notification Settings */}
        {activeTab === 'settings' && (
          <div className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl p-6 sm:p-8 max-w-2xl space-y-6">
            <h3 className="font-serif text-2xl text-[#1A1918] dark:text-[#F5F2ED]">Atelier Intelligence &amp; Alert Preferences</h3>
            <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] leading-relaxed font-light">
              Receive confidential private briefings before rare rough parcels and untreated estate gems are released to the public market.
            </p>

            <div className="space-y-4 pt-2 border-t border-[#F2ECE4] dark:border-[#262320] text-xs sm:text-sm">
              <label className="flex items-center justify-between p-4 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E1D9] dark:border-[#262320] rounded cursor-pointer">
                <div>
                  <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">High-Value Type IIa &amp; Colored Diamond Drops</span>
                  <span className="text-[#78716C] dark:text-[#A69C94] text-xs">Instant alerts for new GIA Flawless stones entering our European vaults.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyDrops}
                  onChange={(e) => setNotifyDrops(e.target.checked)}
                  className="accent-[#1A1918] dark:accent-[#C5A880] w-4 h-4 cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-4 bg-[#FAF8F5] dark:bg-[#121110] border border-[#E8E1D9] dark:border-[#262320] rounded cursor-pointer">
                <div>
                  <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">Consignment Memo Expiry Reminders</span>
                  <span className="text-[#78716C] dark:text-[#A69C94] text-xs">Automated 72-hour notice prior to the expiration of your 14-day client memo.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyMemos}
                  onChange={(e) => setNotifyMemos(e.target.checked)}
                  className="accent-[#1A1918] dark:accent-[#C5A880] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <button
              onClick={() => alert('Preferences saved successfully.')}
              className="px-7 py-3 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs sm:text-sm uppercase tracking-wider font-bold rounded cursor-pointer hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors"
            >
              Save Preferences
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

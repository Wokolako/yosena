import React, { useEffect, useState } from 'react';
import { Gemstone, CustomerMemo, CustomerOrder } from '../types';
import { AuthUser, useAuth } from '../context/AuthContext';
import { CONTACT_EMAIL } from '../lib/contact';
import {
  ShieldCheck,
  FileText,
  Clock,
  Bell,
  Star,
  Trash2,
  Eye,
  Package,
  Loader2,
  Hourglass,
} from 'lucide-react';

interface MembersVaultProps {
  user: AuthUser;
  savedStones: Gemstone[];
  onSelectStone: (stone: Gemstone) => void;
  onRemoveSaved: (stoneId: string) => void;
  onNavigateShop: () => void;
}

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')} USD`;

export const MembersVault: React.FC<MembersVaultProps> = ({
  user,
  savedStones,
  onSelectStone,
  onRemoveSaved,
  onNavigateShop,
}) => {
  const { updateProfile, isApprovedTrade } = useAuth();
  const [activeTab, setActiveTab] = useState<'vault' | 'orders' | 'memos' | 'settings'>('vault');
  const [notifyDrops, setNotifyDrops] = useState(user.preferences.notifyDrops);
  const [notifyMemos, setNotifyMemos] = useState(user.preferences.notifyMemos);
  const [prefsStatus, setPrefsStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [savingPrefs, setSavingPrefs] = useState(false);
  const [memos, setMemos] = useState<CustomerMemo[] | null>(null);
  const [orders, setOrders] = useState<CustomerOrder[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  // The member's own orders and memos, straight from the server.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, o] = await Promise.all([
          fetch('/api/memos', { cache: 'no-store' }).then((r) => r.json()),
          fetch('/api/orders', { cache: 'no-store' }).then((r) => r.json()),
        ]);
        if (cancelled) return;
        setMemos(m?.success ? m.data : []);
        setOrders(o?.success ? o.data : []);
        if (!m?.success || !o?.success) setLoadError('Some of your records could not be loaded. Please refresh.');
      } catch {
        if (!cancelled) setLoadError('Could not reach the trade desk. Check your connection.');
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

  const savePreferences = async () => {
    setSavingPrefs(true);
    setPrefsStatus(null);
    const result = await updateProfile({ preferences: { notifyDrops, notifyMemos } });
    setSavingPrefs(false);
    setPrefsStatus(result.ok ? { ok: true, text: 'Preferences saved.' } : { ok: false, text: result.error ?? 'Could not save.' });
  };

  const tabClass = (tab: typeof activeTab) =>
    `pb-3 relative flex items-center gap-2 cursor-pointer shrink-0 whitespace-nowrap ${
      activeTab === tab
        ? 'text-[#1A1918] dark:text-[#F5F2ED] border-b-2 border-[#1A1918] dark:border-[#C5A880]'
        : 'text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
    }`;

  const emptyCard = (text: string) => (
    <div className="text-center py-16 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl p-8 text-sm text-[#78716C] dark:text-[#A69C94]">
      {text}
    </div>
  );

  const loadingCard = (
    <div className="py-16 flex justify-center text-[#C5A880]">
      <Loader2 className="w-6 h-6 animate-spin" />
    </div>
  );

  return (
    <div className="py-12 lg:py-20 bg-[#FAF8F5] dark:bg-[#0F0E0D] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {user.status === 'pending' && (
          <div className="mb-6 flex items-start gap-3 p-4 rounded-lg bg-[#FAF6EF] dark:bg-[#1C1814] border border-[#C5A880] text-sm">
            <Hourglass className="w-5 h-5 text-[#8C6D44] dark:text-[#C5A880] shrink-0 mt-0.5" />
            <p className="text-[#57534E] dark:text-[#D5CDC4]">
              <strong className="text-[#1A1918] dark:text-[#F5F2ED]">Your trade account is awaiting verification.</strong>{' '}
              You can save stones and place bank-wire orders now. Online payment and inspection memos open once the trade
              desk has verified your business. Questions: {CONTACT_EMAIL}.
            </p>
          </div>
        )}

        {/* Jeweller Member Profile Banner */}
        <div className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl p-6 sm:p-8 mb-8 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[#1A1918] dark:bg-[#FAF8F5] text-[#FAF8F5] dark:text-[#1A1918] flex items-center justify-center font-serif text-2xl font-bold border-2 border-[#C5A880] shrink-0">
              {initials}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="font-serif text-2xl sm:text-3xl text-[#1A1918] dark:text-[#F5F2ED]">{user.companyName}</h2>
                {isApprovedTrade && (
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

          {isApprovedTrade && (
            <div className="bg-[#FAF8F5] dark:bg-[#121110] p-3.5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] text-xs sm:text-sm text-right hidden sm:block">
              <span className="text-xs uppercase text-[#8C827A] dark:text-[#A69C94] block font-bold">Approved Memo Credit Line</span>
              <span className="font-serif text-lg font-bold text-[#1A1918] dark:text-[#F5F2ED]">{usd(user.creditLineUSD)}</span>
            </div>
          )}
        </div>

        {loadError && <p className="mb-4 text-sm text-[#8C4632] dark:text-[#D9846C]">{loadError}</p>}

        {/* Tab Navigation */}
        <div className="flex border-b border-[#E8E1D9] dark:border-[#262320] mb-8 gap-6 sm:gap-8 text-xs sm:text-sm uppercase tracking-wider font-bold overflow-x-auto">
          <button onClick={() => setActiveTab('vault')} className={tabClass('vault')}>
            <Star className="w-4 h-4 text-[#C5A880]" />
            <span>Saved Atelier Stones ({savedStones.length})</span>
          </button>
          <button onClick={() => setActiveTab('orders')} className={tabClass('orders')}>
            <Package className="w-4 h-4 text-[#C5A880]" />
            <span>Orders ({orders?.length ?? '…'})</span>
          </button>
          <button onClick={() => setActiveTab('memos')} className={tabClass('memos')}>
            <FileText className="w-4 h-4 text-[#C5A880]" />
            <span>Consignment Memos ({memos?.length ?? '…'})</span>
          </button>
          <button onClick={() => setActiveTab('settings')} className={tabClass('settings')}>
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
                      {stone.status !== 'In Vault' && (
                        <div className="absolute bottom-2.5 left-2.5 bg-[#1A1918]/90 text-[#FAF8F5] px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider">
                          {stone.status}
                        </div>
                      )}
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

        {/* Tab Content 2: Orders */}
        {activeTab === 'orders' && (
          orders === null ? loadingCard : orders.length === 0 ? emptyCard('No orders yet. Orders you place while signed in appear here.') : (
            <div className="space-y-4">
              {orders.map((order) => (
                <div
                  key={order.reference}
                  className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#1A1918] dark:text-[#F5F2ED]">{order.reference}</span>
                      <span className="bg-[#FEF3C7] dark:bg-[#3D2E0F] text-[#92400E] dark:text-[#FDE68A] px-2.5 py-0.5 rounded text-xs uppercase font-bold tracking-wider">
                        {order.statusLabel}
                      </span>
                    </div>
                    <h4 className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED] font-normal">
                      {order.items.map((i) => i.name).join(', ')}
                    </h4>
                    <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] pt-1">
                      <span>Placed: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{new Date(order.createdAt).toLocaleDateString()}</strong></span>
                      <span>Total: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{usd(order.totalUSD)}</strong></span>
                      {order.tracking && (
                        <span>Tracking: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{order.courier} {order.tracking}</strong></span>
                      )}
                      {order.reservedUntil && (
                        <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Reserved until {new Date(order.reservedUntil).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab Content 3: Memos */}
        {activeTab === 'memos' && (
          memos === null ? loadingCard : memos.length === 0 ? emptyCard(
            isApprovedTrade
              ? 'No memos yet. Choose "14-Day Inspection Memo" at checkout to request one.'
              : 'Inspection memos are available once your trade account is verified.'
          ) : (
            <div className="space-y-4">
              {memos.map((memo) => (
                <div
                  key={memo.id}
                  className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs sm:text-sm font-bold text-[#1A1918] dark:text-[#F5F2ED]">{memo.id}</span>
                      <span className="bg-[#FEF3C7] dark:bg-[#3D2E0F] text-[#92400E] dark:text-[#FDE68A] px-2.5 py-0.5 rounded text-xs uppercase font-bold tracking-wider">
                        {memo.status}
                      </span>
                    </div>
                    <h4 className="font-serif text-xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">{memo.stoneName}</h4>
                    <div className="flex flex-wrap gap-4 text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] pt-1">
                      {memo.courier && <span>Courier: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{memo.courier}</strong></span>}
                      {memo.tracking && <span>Tracking: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{memo.tracking}</strong></span>}
                      <span>Declared Value: <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{usd(memo.declaredValueUSD)}</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 border-t lg:border-t-0 pt-4 lg:pt-0 border-[#F2ECE4] dark:border-[#262320]">
                    {memo.daysRemaining !== null && (
                      <div className="text-right">
                        <span className="text-xs uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-bold">Inspection Window</span>
                        <span className="text-xs sm:text-sm font-bold text-[#DC2626] dark:text-[#EF4444] flex items-center gap-1 justify-end">
                          <Clock className="w-4 h-4" /> {memo.daysRemaining} Days Left
                        </span>
                      </div>
                    )}
                    {memo.status === 'On Memo' && (
                      <a
                        href={`mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(`Settlement or return for memo ${memo.id}`)}`}
                        className="px-5 py-2.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs sm:text-sm uppercase tracking-wider font-bold rounded hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Confirm Purchase / Return
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {/* Tab Content 4: Notification Settings */}
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
                  <span className="text-[#78716C] dark:text-[#A69C94] text-xs">Alerts for new GIA Flawless stones entering our vaults.</span>
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
                  <span className="text-[#78716C] dark:text-[#A69C94] text-xs">Notice before the end of your 14-day memo window.</span>
                </div>
                <input
                  type="checkbox"
                  checked={notifyMemos}
                  onChange={(e) => setNotifyMemos(e.target.checked)}
                  className="accent-[#1A1918] dark:accent-[#C5A880] w-4 h-4 cursor-pointer"
                />
              </label>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={savePreferences}
                disabled={savingPrefs}
                className="px-7 py-3 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs sm:text-sm uppercase tracking-wider font-bold rounded cursor-pointer hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors disabled:opacity-60 flex items-center gap-2"
              >
                {savingPrefs && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Preferences
              </button>
              {prefsStatus && (
                <span className={`text-sm font-semibold ${prefsStatus.ok ? 'text-[#2E7D32] dark:text-[#81C784]' : 'text-[#8C4632] dark:text-[#D9846C]'}`}>
                  {prefsStatus.text}
                </span>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

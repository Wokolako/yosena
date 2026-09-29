'use client';

import React, { useState } from 'react';
import { ShieldCheck, LogOut, ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ThemeToggle } from '../components/ThemeToggle';
import { OverviewModule } from './modules/Overview';
import { InventoryModule } from './modules/Inventory';
import { OrdersModule } from './modules/Orders';
import { MemosModule } from './modules/Memos';
import { BookingsModule } from './modules/Bookings';
import { QuotesModule } from './modules/Quotes';
import { AccountsModule } from './modules/Accounts';
import { ContentModule } from './modules/Content';
import { LogsModule } from './modules/Logs';

export type AdminTab =
  | 'overview'
  | 'inventory'
  | 'orders'
  | 'memos'
  | 'bookings'
  | 'quotes'
  | 'accounts'
  | 'content'
  | 'logs';

const TABS: { id: AdminTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'inventory', label: 'Inventory' },
  { id: 'orders', label: 'Orders' },
  { id: 'memos', label: 'Memos' },
  { id: 'bookings', label: 'Bookings' },
  { id: 'quotes', label: 'Quotes' },
  { id: 'accounts', label: 'Trade Accounts' },
  { id: 'content', label: 'Content' },
  { id: 'logs', label: 'Logs' },
];

export const AdminConsole: React.FC<{ adminName: string; adminEmail: string }> = ({ adminName, adminEmail }) => {
  const [tab, setTab] = useState<AdminTab>('overview');
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    window.location.href = '/';
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] dark:bg-[#0F0E0D] text-[#1A1918] dark:text-[#F5F2ED] transition-colors">
      <header className="sticky top-0 z-30 bg-[#FFFFFF]/95 dark:bg-[#181614]/95 backdrop-blur border-b border-[#E8E1D9] dark:border-[#262320]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94]">
              <ShieldCheck className="w-4 h-4 text-[#C5A880]" /> YosenaMora Trade Desk
            </div>
            <h1 className="font-serif text-2xl sm:text-3xl">Admin Console</h1>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="hidden sm:block text-right text-[#78716C] dark:text-[#A69C94]">
              Signed in as <strong className="text-[#1A1918] dark:text-[#F5F2ED]">{adminName}</strong>
              <br />
              {adminEmail}
            </span>
            <ThemeToggle variant="compact" />
            <a
              href="/"
              className="px-3 py-2 rounded border border-[#D5CDC4] dark:border-[#38332E] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:border-[#1A1918] dark:hover:border-[#F5F2ED]"
            >
              <ExternalLink className="w-3.5 h-3.5" /> View Site
            </a>
            <button
              onClick={handleSignOut}
              className="px-3 py-2 rounded border border-[#D5CDC4] dark:border-[#38332E] font-bold uppercase tracking-wider flex items-center gap-1.5 hover:border-[#1A1918] dark:hover:border-[#F5F2ED] cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" /> Sign Out
            </button>
          </div>
        </div>
        <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex gap-5 overflow-x-auto text-xs font-bold uppercase tracking-wider" aria-label="Admin sections">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              aria-current={tab === t.id ? 'page' : undefined}
              className={`pb-3 pt-1 border-b-2 whitespace-nowrap cursor-pointer transition-colors ${
                tab === t.id
                  ? 'border-[#1A1918] dark:border-[#C5A880] text-[#1A1918] dark:text-[#F5F2ED]'
                  : 'border-transparent text-[#8C827A] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {tab === 'overview' && <OverviewModule onOpen={setTab} />}
        {tab === 'inventory' && <InventoryModule />}
        {tab === 'orders' && <OrdersModule />}
        {tab === 'memos' && <MemosModule />}
        {tab === 'bookings' && <BookingsModule />}
        {tab === 'quotes' && <QuotesModule />}
        {tab === 'accounts' && <AccountsModule />}
        {tab === 'content' && <ContentModule />}
        {tab === 'logs' && <LogsModule />}
      </main>
    </div>
  );
};

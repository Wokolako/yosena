'use client';

import React from 'react';
import type { AdminTab } from '../AdminConsole';
import { Panel, useResource, fmtUSD, Loading, Notice, Button } from '../ui';

interface OverviewData {
  stonesListed: number;
  vaultValueUSD: number;
  stonesByStatus: { status: string; count: number }[];
  ordersAwaitingPayment: number;
  ordersToShip: number;
  ordersNeedingAttention: number;
  memoRequests: number;
  memosOut: number;
  bookingsPending: number;
  quotesNew: number;
  accountsPending: number;
  conciergeHandoffs: number;
}

export const OverviewModule: React.FC<{ onOpen: (tab: AdminTab) => void }> = ({ onOpen }) => {
  const { data, error, loading, reload } = useResource<OverviewData>('/api/admin/overview');

  if (loading && !data) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;
  if (!data) return null;

  const tasks: { label: string; value: number; tab: AdminTab; urgent?: boolean }[] = [
    { label: 'Orders needing attention', value: data.ordersNeedingAttention, tab: 'orders', urgent: true },
    { label: 'Orders awaiting payment', value: data.ordersAwaitingPayment, tab: 'orders' },
    { label: 'Paid orders to ship', value: data.ordersToShip, tab: 'orders', urgent: true },
    { label: 'Memo requests to review', value: data.memoRequests, tab: 'memos', urgent: true },
    { label: 'Stones out on memo', value: data.memosOut, tab: 'memos' },
    { label: 'Appointment requests', value: data.bookingsPending, tab: 'bookings', urgent: true },
    { label: 'New quote requests', value: data.quotesNew, tab: 'quotes', urgent: true },
    { label: 'Trade accounts to verify', value: data.accountsPending, tab: 'accounts', urgent: true },
    { label: 'Concierge hand-offs', value: data.conciergeHandoffs, tab: 'logs' },
  ];

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320]">
          <span className="text-xs uppercase font-bold tracking-wider text-[#8C827A] dark:text-[#A69C94]">Unsold vault value</span>
          <p className="font-serif text-3xl font-semibold mt-1">{fmtUSD(data.vaultValueUSD)}</p>
          <p className="text-xs text-[#78716C] dark:text-[#A69C94]">{data.stonesListed} stones listed</p>
        </div>
        {data.stonesByStatus.map((s) => (
          <button
            key={s.status}
            onClick={() => onOpen('inventory')}
            className="text-left p-5 rounded-xl bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] hover:border-[#C5A880] cursor-pointer"
          >
            <span className="text-xs uppercase font-bold tracking-wider text-[#8C827A] dark:text-[#A69C94]">{s.status}</span>
            <p className="font-serif text-3xl font-semibold mt-1">{s.count}</p>
          </button>
        ))}
      </div>

      <Panel title="Work queue" actions={<Button onClick={() => void reload()} busy={loading}>Refresh</Button>}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {tasks.map((t) => (
            <button
              key={t.label}
              onClick={() => onOpen(t.tab)}
              className={`text-left p-4 rounded-lg border cursor-pointer transition-colors ${
                t.urgent && t.value > 0
                  ? 'border-[#C5A880] bg-[#FFFDF7] dark:bg-[#1C1814]'
                  : 'border-[#E8E1D9] dark:border-[#262320] hover:border-[#C5A880]'
              }`}
            >
              <span className="text-xs text-[#78716C] dark:text-[#A69C94]">{t.label}</span>
              <p className="font-serif text-2xl font-semibold">{t.value}</p>
            </button>
          ))}
        </div>
      </Panel>
    </>
  );
};

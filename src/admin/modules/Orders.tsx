'use client';

import React, { useMemo, useState } from 'react';
import { Panel, useResource, apiSend, useFlash, Button, Field, Pill, statusTone, fmtUSD, fmtDate, inputCls, Loading, Notice, Empty } from '../ui';

interface AdminOrder {
  id: string;
  reference: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  contact: { clientName: string; companyName: string; email: string; phone: string; address: string; city: string; country: string };
  items: { stoneId: string; name: string; carat: number; priceUSD: number }[];
  subtotalUSD?: number;
  discountUSD?: number;
  shippingUSD?: number;
  taxUSD?: number;
  totalUSD: number;
  promoCode?: string | null;
  shippingLabel?: string;
  shippingService?: string;
  reservedUntil?: string | null;
  courier?: string | null;
  tracking?: string | null;
  adminNotes?: string;
  attention?: string | null;
  payment?: { provider: string; sessionId?: string; paymentIntentId?: string | null; paymentStatus?: string } | null;
  history: { at: string; status: string; by: string; note?: string }[];
  orderLink?: string | null;
  createdAt: string;
}

const OPEN = ['pending_payment', 'processing_payment', 'awaiting_wire', 'paid', 'shipped'];

export const OrdersModule: React.FC = () => {
  const { data: orders, error, loading, reload } = useResource<AdminOrder[]>('/api/admin/orders');
  const flash = useFlash();
  const [filter, setFilter] = useState<'open' | 'attention' | 'all'>('open');
  const [openId, setOpenId] = useState<string | null>(null);

  const visible = useMemo(() => {
    const list = orders ?? [];
    if (filter === 'attention') return list.filter((o) => o.attention);
    if (filter === 'open') return list.filter((o) => OPEN.includes(o.status) || o.attention);
    return list;
  }, [orders, filter]);

  const act = async (order: AdminOrder, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const result = await apiSend(`/api/admin/orders/${encodeURIComponent(order.id)}`, 'PATCH', body);
    flash.show(result, 'Order updated.');
    if (result.ok) void reload();
  };

  if (loading && !orders) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <>
      {flash.node}
      <Panel
        title={`Orders (${visible.length})`}
        actions={
          <>
            <select className={`${inputCls} w-48`} value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              <option value="open">Open orders</option>
              <option value="attention">Needs attention</option>
              <option value="all">All orders</option>
            </select>
            <Button onClick={() => void reload()} busy={loading}>Refresh</Button>
          </>
        }
      >
        {visible.length === 0 ? (
          <Empty>No orders here.</Empty>
        ) : (
          <div className="space-y-3">
            {visible.map((o) => (
              <OrderRow key={o.id} order={o} open={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)} onAct={act} />
            ))}
          </div>
        )}
      </Panel>
    </>
  );
};

const OrderRow: React.FC<{
  order: AdminOrder;
  open: boolean;
  onToggle: () => void;
  onAct: (order: AdminOrder, body: Record<string, unknown>, confirmText?: string) => Promise<void>;
}> = ({ order: o, open, onToggle, onAct }) => {
  const [courier, setCourier] = useState(o.courier ?? '');
  const [tracking, setTracking] = useState(o.tracking ?? '');
  const [notes, setNotes] = useState(o.adminNotes ?? '');
  const unpaid = ['pending_payment', 'processing_payment', 'awaiting_wire'].includes(o.status);

  return (
    <div className={`rounded-lg border ${o.attention ? 'border-[#C5A880] ring-1 ring-[#C5A880]/40' : 'border-[#E8E1D9] dark:border-[#262320]'}`}>
      <button onClick={onToggle} className="w-full text-left p-4 flex flex-wrap items-center justify-between gap-3 cursor-pointer">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold text-sm">{o.reference}</span>
            <Pill tone={statusTone(o.status)}>{o.statusLabel}</Pill>
            <Pill>{o.paymentMethod ?? 'unknown'}</Pill>
            {o.attention && <Pill tone="bad">Needs attention</Pill>}
          </div>
          <div className="text-xs text-[#78716C] dark:text-[#A69C94]">
            {o.contact.companyName} · {o.contact.email} · {fmtDate(o.createdAt, true)}
          </div>
        </div>
        <div className="text-right">
          <div className="font-serif text-lg font-bold">{fmtUSD(o.totalUSD)}</div>
          <div className="text-xs text-[#78716C] dark:text-[#A69C94]">{o.items.length} stone{o.items.length === 1 ? '' : 's'}</div>
        </div>
      </button>

      {open && (
        <div className="border-t border-[#E8E1D9] dark:border-[#262320] p-4 space-y-4 text-sm">
          {o.attention && <Notice tone="warn">{o.attention}</Notice>}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C827A] mb-1">Customer</h4>
              <p>{o.contact.clientName}, {o.contact.companyName}</p>
              <p>{o.contact.email}{o.contact.phone ? ` · ${o.contact.phone}` : ''}</p>
              <p className="text-[#78716C] dark:text-[#A69C94]">{[o.contact.address, o.contact.city, o.contact.country].filter(Boolean).join(', ')}</p>
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C827A] mb-1">Stones</h4>
              {o.items.map((i) => (
                <p key={i.stoneId}>{i.name} — {fmtUSD(i.priceUSD)}</p>
              ))}
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C827A] mb-1">Totals</h4>
              <p>Subtotal {fmtUSD(o.subtotalUSD ?? o.totalUSD)}{o.discountUSD ? ` · discount −${fmtUSD(o.discountUSD)} (${o.promoCode})` : ''}</p>
              <p>Delivery {fmtUSD(o.shippingUSD ?? 0)} ({o.shippingLabel ?? o.shippingService ?? '—'}) · Tax {fmtUSD(o.taxUSD ?? 0)}</p>
              <p className="font-bold">Total {fmtUSD(o.totalUSD)}</p>
              {o.reservedUntil && unpaid && <p className="text-xs text-[#78716C]">Stones held until {fmtDate(o.reservedUntil, true)}</p>}
              {o.payment?.sessionId && <p className="text-xs text-[#78716C] break-all">Stripe session {o.payment.sessionId}</p>}
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {(o.status === 'awaiting_wire' || o.status === 'processing_payment' || o.status === 'expired') && (
              <Button variant="primary" onClick={() => onAct(o, { action: 'mark_paid' }, `Confirm the payment for ${o.reference} has cleared? The stones will be marked sold.`)}>
                Mark payment received
              </Button>
            )}
            {unpaid && <Button onClick={() => onAct(o, { action: 'extend_hold', hours: 72 })}>Extend hold 72h</Button>}
            {(unpaid || o.status === 'expired') && (
              <Button variant="danger" onClick={() => onAct(o, { action: 'cancel' }, `Cancel ${o.reference} and release its stones?`)}>Cancel order</Button>
            )}
            {o.status === 'shipped' && <Button onClick={() => onAct(o, { action: 'mark_completed' })}>Mark delivered</Button>}
            {['paid', 'shipped', 'completed'].includes(o.status) && (
              <Button variant="danger" onClick={() => onAct(o, { action: 'refund' }, `Record that ${o.reference} was refunded? Issue the refund itself with your bank or payment provider. Its stones return to the vault.`)}>
                Record refund
              </Button>
            )}
            {o.orderLink && (
              <Button variant="ghost" onClick={() => navigator.clipboard?.writeText(`${window.location.origin}${o.orderLink}`)}>Copy customer order link</Button>
            )}
          </div>

          {o.status === 'paid' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
              <Field label="Courier"><input className={inputCls} value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Malca-Amit" /></Field>
              <Field label="Tracking number"><input className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
              <Button variant="primary" onClick={() => onAct(o, { action: 'mark_shipped', courier, tracking })}>Mark shipped</Button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
            <Field label="Internal notes" className="sm:col-span-3">
              <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <Button onClick={() => onAct(o, { action: 'note', adminNotes: notes })}>Save notes</Button>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#8C827A] mb-1">History</h4>
            <ul className="text-xs space-y-0.5 text-[#57534E] dark:text-[#D5CDC4]">
              {o.history.map((h, i) => (
                <li key={i}>
                  {fmtDate(h.at, true)} — {h.status} by {h.by}{h.note ? ` (${h.note})` : ''}
                </li>
              ))}
              {o.history.length === 0 && <li>No history recorded (created before order tracking).</li>}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

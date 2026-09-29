'use client';

import React, { useMemo, useState } from 'react';
import { Panel, useResource, apiSend, useFlash, Button, Field, Pill, statusTone, fmtUSD, fmtDate, inputCls, Loading, Notice, Empty } from '../ui';

interface AdminQuote {
  id: string;
  gemType: string;
  shape: string;
  caratSize?: number;
  caratMin: number;
  caratMax: number;
  clarityTier?: string;
  originPreference?: string;
  quantity: number;
  jewellerBusiness: string;
  contactEmail: string;
  notes: string;
  estimatedTotal?: number;
  status: string;
  adminReply?: string;
  createdAt: string;
}

const STATUSES = ['New', 'Replied', 'Converted', 'Closed'];

export const QuotesModule: React.FC = () => {
  const { data: quotes, error, loading, reload } = useResource<AdminQuote[]>('/api/admin/quotes');
  const flash = useFlash();
  const [showClosed, setShowClosed] = useState(false);

  const visible = useMemo(
    () => (quotes ?? []).filter((q) => showClosed || !['Closed', 'Converted'].includes(q.status)),
    [quotes, showClosed]
  );

  const save = async (q: AdminQuote, body: Record<string, unknown>) => {
    const result = await apiSend(`/api/admin/quotes/${encodeURIComponent(q.id)}`, 'PATCH', body);
    flash.show(result, 'Quote updated.');
    if (result.ok) void reload();
  };

  if (loading && !quotes) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <>
      {flash.node}
      <Panel
        title={`Wholesale quote requests (${visible.length})`}
        actions={
          <>
            <label className="text-xs flex items-center gap-1.5">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed
            </label>
            <Button onClick={() => void reload()} busy={loading}>Refresh</Button>
          </>
        }
      >
        {visible.length === 0 ? <Empty>No quote requests here.</Empty> : (
          <div className="space-y-3">
            {visible.map((q) => <QuoteRow key={q.id} quote={q} onSave={save} />)}
          </div>
        )}
      </Panel>
    </>
  );
};

const QuoteRow: React.FC<{ quote: AdminQuote; onSave: (q: AdminQuote, body: Record<string, unknown>) => Promise<void> }> = ({ quote: q, onSave }) => {
  const [status, setStatus] = useState(STATUSES.includes(q.status) ? q.status : 'New');
  const [reply, setReply] = useState(q.adminReply ?? '');
  const carat = q.caratSize ?? (q.caratMin === q.caratMax ? q.caratMin : `${q.caratMin}–${q.caratMax}`);

  return (
    <div className="rounded-lg border border-[#E8E1D9] dark:border-[#262320] p-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold">{q.id}</span>
            <Pill tone={statusTone(q.status)}>{q.status}</Pill>
          </div>
          <p className="font-bold mt-1">
            {q.quantity} × {carat}ct {q.shape} {q.gemType}{q.clarityTier ? ` · ${q.clarityTier}` : ''}
          </p>
          <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
            {q.jewellerBusiness} · {q.contactEmail} · {fmtDate(q.createdAt, true)}{q.originPreference ? ` · ${q.originPreference}` : ''}
          </p>
          {q.notes && <p className="text-xs mt-1">“{q.notes}”</p>}
        </div>
        <div className="text-right">
          <div className="text-xs text-[#78716C] dark:text-[#A69C94]">Calculator estimate</div>
          <div className="font-serif text-lg font-bold">{fmtUSD(q.estimatedTotal)}</div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-6 gap-3 items-end">
        <Field label="Status">
          <select className={inputCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUSES.map((s) => <option key={s}>{s}</option>)}
          </select>
        </Field>
        <Field label="Reply / internal notes" className="sm:col-span-3">
          <textarea className={inputCls} rows={1} value={reply} onChange={(e) => setReply(e.target.value)} />
        </Field>
        <Button variant="primary" onClick={() => onSave(q, { status, adminReply: reply })}>Save</Button>
        <a
          className="px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider text-[#8C6D44] dark:text-[#C5A880] hover:underline"
          href={`mailto:${q.contactEmail}?subject=${encodeURIComponent(`Your YosenaMora quote ${q.id}`)}`}
        >
          Email jeweller
        </a>
      </div>
    </div>
  );
};

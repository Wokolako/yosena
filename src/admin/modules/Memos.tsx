'use client';

import React, { useMemo, useState } from 'react';
import { Panel, useResource, apiSend, useFlash, Button, Field, Pill, statusTone, fmtUSD, fmtDate, inputCls, Loading, Notice, Empty } from '../ui';

interface AdminMemo {
  id: string;
  companyName: string;
  memberId: string;
  stoneId: string;
  stoneName: string;
  declaredValueUSD: number;
  status: string;
  courier: string;
  tracking: string;
  dateDispatched: string | null;
  dueDate: string | null;
  daysRemaining: number | null;
  notes?: string;
  adminNotes?: string;
  history: { at: string; status: string; by: string; note?: string }[];
  member: { email: string; clientName: string; creditLineUSD: number; openExposureUSD: number } | null;
  createdAt: string;
}

const CLOSED = ['Rejected', 'Returned', 'Sold', 'Expired'];

export const MemosModule: React.FC = () => {
  const { data: memos, error, loading, reload } = useResource<AdminMemo[]>('/api/admin/memos');
  const flash = useFlash();
  const [showClosed, setShowClosed] = useState(false);

  const visible = useMemo(
    () => (memos ?? []).filter((m) => showClosed || !CLOSED.includes(m.status)),
    [memos, showClosed]
  );

  const act = async (memo: AdminMemo, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const result = await apiSend(`/api/admin/memos/${encodeURIComponent(memo.id)}`, 'PATCH', body);
    flash.show(result, 'Memo updated.');
    if (result.ok) void reload();
  };

  if (loading && !memos) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <>
      {flash.node}
      <Panel
        title={`Consignment memos (${visible.length})`}
        actions={
          <>
            <label className="text-xs flex items-center gap-1.5">
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> Show closed
            </label>
            <Button onClick={() => void reload()} busy={loading}>Refresh</Button>
          </>
        }
      >
        {visible.length === 0 ? <Empty>No memos here.</Empty> : (
          <div className="space-y-3">
            {visible.map((m) => <MemoRow key={m.id} memo={m} onAct={act} />)}
          </div>
        )}
      </Panel>
    </>
  );
};

const MemoRow: React.FC<{ memo: AdminMemo; onAct: (m: AdminMemo, body: Record<string, unknown>, confirmText?: string) => Promise<void> }> = ({ memo: m, onAct }) => {
  const [courier, setCourier] = useState(m.courier || '');
  const [tracking, setTracking] = useState(m.tracking || '');
  const [notes, setNotes] = useState(m.adminNotes ?? '');
  const closed = CLOSED.includes(m.status);

  return (
    <div className="rounded-lg border border-[#E8E1D9] dark:border-[#262320] p-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold">{m.id}</span>
            <Pill tone={statusTone(m.status)}>{m.status}</Pill>
          </div>
          <p className="font-bold mt-1">{m.stoneName}</p>
          <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
            {m.companyName} ({m.memberId}){m.member ? ` · ${m.member.clientName} · ${m.member.email}` : ''} · requested {fmtDate(m.createdAt)}
          </p>
          {m.notes && <p className="text-xs mt-1">Member note: {m.notes}</p>}
        </div>
        <div className="text-right text-xs">
          <div className="font-serif text-lg font-bold">{fmtUSD(m.declaredValueUSD)}</div>
          {m.member && (
            <div className="text-[#78716C] dark:text-[#A69C94]">
              Credit line {fmtUSD(m.member.creditLineUSD)} · open memos {fmtUSD(m.member.openExposureUSD)}
            </div>
          )}
          {m.dueDate && <div>Due back {fmtDate(m.dueDate)}{m.daysRemaining !== null ? ` (${m.daysRemaining} days)` : ''}</div>}
          {m.courier && <div>{m.courier} {m.tracking}</div>}
        </div>
      </div>

      {m.status === 'Requested' && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Field label="Courier *"><input className={inputCls} value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="Ferrari Logistics" /></Field>
          <Field label="Tracking"><input className={inputCls} value={tracking} onChange={(e) => setTracking(e.target.value)} /></Field>
          <Button variant="primary" onClick={() => onAct(m, { action: 'approve', courier, tracking })}>Approve &amp; dispatch</Button>
          <Button variant="danger" onClick={() => onAct(m, { action: 'reject' }, `Reject ${m.id} and release the stone?`)}>Reject</Button>
        </div>
      )}

      {!closed && m.status !== 'Requested' && (
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => onAct(m, { action: 'mark_returned' }, `Record that the stone for ${m.id} is back in the vault?`)}>Stone returned</Button>
          <Button variant="primary" onClick={() => onAct(m, { action: 'mark_sold' }, `Record that the member bought the stone on ${m.id}? It will be marked sold.`)}>Member bought it</Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <Field label="Internal notes" className="sm:col-span-3">
          <textarea className={inputCls} rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button onClick={() => onAct(m, { action: 'note', adminNotes: notes })}>Save notes</Button>
      </div>
    </div>
  );
};

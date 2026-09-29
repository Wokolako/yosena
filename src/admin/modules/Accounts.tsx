'use client';

import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Panel, useResource, apiSend, useFlash, Button, Field, Pill, statusTone, fmtUSD, fmtDate, inputCls, Loading, Notice, Empty } from '../ui';

interface AdminAccount {
  id: string;
  email: string;
  clientName: string;
  companyName: string;
  memberId: string;
  accountRole: string;
  status: 'pending' | 'active' | 'disabled';
  tier: string;
  creditLineUSD: number;
  phone: string;
  address: string;
  isVerifiedTrade: boolean;
  createdAt: string;
  lastLoginAt: string | null;
  openMemoExposureUSD: number;
}

const ORDER: Record<string, number> = { pending: 0, active: 1, disabled: 2 };

export const AccountsModule: React.FC = () => {
  const { data: accounts, error, loading, reload } = useResource<AdminAccount[]>('/api/admin/accounts');
  const { user: me } = useAuth();
  const flash = useFlash();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (accounts ?? [])
      .filter((a) => !q || [a.email, a.companyName, a.clientName, a.memberId].some((f) => f.toLowerCase().includes(q)))
      .sort((a, b) => ORDER[a.status] - ORDER[b.status] || b.createdAt.localeCompare(a.createdAt));
  }, [accounts, query]);

  const update = async (a: AdminAccount, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const result = await apiSend(`/api/admin/accounts/${encodeURIComponent(a.id)}`, 'PATCH', body);
    flash.show(result, 'Account updated.');
    if (result.ok) void reload();
  };

  if (loading && !accounts) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <>
      {flash.node}
      <Notice tone="warn">
        Verify each business (company registration, trade references, identity) before approving. Approval enables online
        payment and memo requests up to the credit line you set. Admin accounts can only be created on the server with
        <code className="mx-1">npm run create-admin</code>.
      </Notice>
      <Panel
        title={`Trade accounts (${visible.length})`}
        actions={<input className={`${inputCls} w-64`} placeholder="Search email, company, member id…" value={query} onChange={(e) => setQuery(e.target.value)} />}
      >
        {visible.length === 0 ? <Empty>No accounts match.</Empty> : (
          <div className="space-y-3">
            {visible.map((a) => <AccountRow key={a.id} account={a} isSelf={a.id === me?.id} onUpdate={update} />)}
          </div>
        )}
      </Panel>
    </>
  );
};

const AccountRow: React.FC<{
  account: AdminAccount;
  isSelf: boolean;
  onUpdate: (a: AdminAccount, body: Record<string, unknown>, confirmText?: string) => Promise<void>;
}> = ({ account: a, isSelf, onUpdate }) => {
  const [tier, setTier] = useState(a.status === 'pending' ? 'Registered Trade Partner' : a.tier);
  const [credit, setCredit] = useState(String(a.creditLineUSD || ''));

  return (
    <div className="rounded-lg border border-[#E8E1D9] dark:border-[#262320] p-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-bold">{a.companyName}</span>
            <Pill tone={statusTone(a.status)}>{a.status}</Pill>
            {a.accountRole === 'admin' && <Pill tone="info">Admin</Pill>}
            {a.isVerifiedTrade && <Pill tone="good">Verified trade</Pill>}
            {isSelf && <Pill>You</Pill>}
          </div>
          <p className="text-xs text-[#78716C] dark:text-[#A69C94] mt-1">
            {a.clientName} · {a.email}{a.phone ? ` · ${a.phone}` : ''} · {a.memberId}
          </p>
          <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
            Joined {fmtDate(a.createdAt)} · last sign-in {fmtDate(a.lastLoginAt, true)}{a.address ? ` · ${a.address}` : ''}
          </p>
        </div>
        <div className="text-right text-xs">
          <div>Credit line <strong>{fmtUSD(a.creditLineUSD)}</strong></div>
          <div>Open memos {fmtUSD(a.openMemoExposureUSD)}</div>
        </div>
      </div>

      {a.accountRole !== 'admin' && (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 items-end">
          <Field label="Tier"><input className={inputCls} value={tier} onChange={(e) => setTier(e.target.value)} /></Field>
          <Field label="Memo credit line (USD)"><input className={inputCls} type="number" min={0} step={1000} value={credit} onChange={(e) => setCredit(e.target.value)} /></Field>
          {a.status === 'pending' ? (
            <Button
              variant="primary"
              onClick={() =>
                onUpdate(a, { status: 'active', isVerifiedTrade: true, tier, creditLineUSD: Number(credit) || 0 }, `Approve ${a.companyName} as a verified trade partner?`)
              }
            >
              Approve
            </Button>
          ) : (
            <Button onClick={() => onUpdate(a, { tier, creditLineUSD: Number(credit) || 0 })}>Save limits</Button>
          )}
          {a.status !== 'disabled' ? (
            <Button variant="danger" disabled={isSelf} onClick={() => onUpdate(a, { status: 'disabled' }, `Disable ${a.email}? They will be signed out and unable to sign in.`)}>
              Disable
            </Button>
          ) : (
            <Button onClick={() => onUpdate(a, { status: 'active' })}>Re-enable</Button>
          )}
          {a.status === 'active' && a.isVerifiedTrade && (
            <Button variant="ghost" onClick={() => onUpdate(a, { isVerifiedTrade: false }, `Remove verified trade status from ${a.companyName}?`)}>
              Revoke verification
            </Button>
          )}
        </div>
      )}
      {a.accountRole === 'admin' && !isSelf && (
        <div className="flex gap-2">
          {a.status !== 'disabled' ? (
            <Button variant="danger" onClick={() => onUpdate(a, { status: 'disabled' }, `Disable admin ${a.email}?`)}>Disable admin</Button>
          ) : (
            <Button onClick={() => onUpdate(a, { status: 'active' })}>Re-enable admin</Button>
          )}
        </div>
      )}
    </div>
  );
};

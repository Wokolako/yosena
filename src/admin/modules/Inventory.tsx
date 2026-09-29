'use client';

import React, { useMemo, useState } from 'react';
import { GEM_CATEGORIES, GEM_SHAPES, STONE_STATUSES } from '../../types';
import { Panel, useResource, apiSend, useFlash, Button, Field, Pill, statusTone, fmtUSD, fmtDate, inputCls, Loading, Notice, Empty } from '../ui';

interface AdminStone {
  id: string;
  name: string;
  category: string;
  shape: string;
  carat: number;
  color: string;
  clarity: string;
  origin: string;
  treatment: string;
  certification: string;
  certNumber: string;
  priceUSD: number;
  pricePerCarat: number;
  dimensions: string;
  image: string;
  featured?: boolean;
  status: string;
  description: string;
  archived?: boolean;
  reservedFor?: string | null;
  reservedUntil?: string | null;
  updatedAt?: string;
}

const BLANK: Partial<AdminStone> = {
  name: '',
  category: 'Diamond',
  shape: 'Emerald Cut',
  carat: undefined,
  priceUSD: undefined,
  color: '',
  clarity: '',
  origin: '',
  treatment: 'None (Untreated / Natural)',
  certification: 'GIA',
  certNumber: '',
  dimensions: '',
  image: '',
  description: '',
  featured: false,
  status: 'In Vault',
};

export const InventoryModule: React.FC = () => {
  const { data: stones, error, loading, reload } = useResource<AdminStone[]>('/api/admin/stones');
  const flash = useFlash();
  const [query, setQuery] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [editing, setEditing] = useState<Partial<AdminStone> | null>(null);
  const [saving, setSaving] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (stones ?? []).filter(
      (s) =>
        (showArchived || !s.archived) &&
        (!q || [s.name, s.id, s.certNumber, s.origin, s.category].some((f) => String(f ?? '').toLowerCase().includes(q)))
    );
  }, [stones, query, showArchived]);

  const save = async () => {
    if (!editing) return;
    setSaving(true);
    const payload = { ...editing, carat: Number(editing.carat), priceUSD: Number(editing.priceUSD) };
    delete (payload as any).pricePerCarat;
    delete (payload as any).reservedFor;
    delete (payload as any).reservedUntil;
    delete (payload as any).updatedAt;
    const result = editing.id
      ? await apiSend(`/api/admin/stones/${encodeURIComponent(editing.id)}`, 'PATCH', payload)
      : await apiSend('/api/admin/stones', 'POST', payload);
    setSaving(false);
    flash.show(result);
    if (result.ok) {
      setEditing(null);
      void reload();
    }
  };

  const archive = async (stone: AdminStone) => {
    if (!window.confirm(`Archive "${stone.name}"? It will disappear from the storefront but its history is kept.`)) return;
    const result = await apiSend(`/api/admin/stones/${encodeURIComponent(stone.id)}`, 'DELETE');
    flash.show(result);
    if (result.ok) void reload();
  };

  const restore = async (stone: AdminStone) => {
    const result = await apiSend(`/api/admin/stones/${encodeURIComponent(stone.id)}`, 'PATCH', { archived: false });
    flash.show(result);
    if (result.ok) void reload();
  };

  const set = (key: keyof AdminStone) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setEditing((prev) => ({ ...prev, [key]: e.target.value }));

  if (loading && !stones) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <>
      {flash.node}

      {editing && (
        <Panel
          title={editing.id ? `Edit ${editing.name}` : 'Add a stone'}
          actions={
            <>
              <Button onClick={() => setEditing(null)}>Cancel</Button>
              <Button variant="primary" onClick={save} busy={saving}>
                {editing.id ? 'Save changes' : 'Add to catalog'}
              </Button>
            </>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Field label="Name *" className="md:col-span-2">
              <input className={inputCls} value={editing.name ?? ''} onChange={set('name')} maxLength={160} />
            </Field>
            <Field label="Status" hint="Stones held by an order or memo change from those tabs.">
              <select className={inputCls} value={editing.status ?? 'In Vault'} onChange={set('status')}>
                {STONE_STATUSES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Category *">
              <select className={inputCls} value={editing.category} onChange={set('category')}>
                {GEM_CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <Field label="Shape *">
              <select className={inputCls} value={editing.shape} onChange={set('shape')}>
                {GEM_SHAPES.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Carat *">
              <input className={inputCls} type="number" step="0.01" min="0.01" value={editing.carat ?? ''} onChange={set('carat')} />
            </Field>
            <Field label="Price (USD) *" hint={editing.carat && editing.priceUSD ? `${fmtUSD(Number(editing.priceUSD) / Number(editing.carat))} per carat` : undefined}>
              <input className={inputCls} type="number" step="1" min="1" value={editing.priceUSD ?? ''} onChange={set('priceUSD')} />
            </Field>
            <Field label="Colour">
              <input className={inputCls} value={editing.color ?? ''} onChange={set('color')} />
            </Field>
            <Field label="Clarity">
              <input className={inputCls} value={editing.clarity ?? ''} onChange={set('clarity')} />
            </Field>
            <Field label="Origin">
              <input className={inputCls} value={editing.origin ?? ''} onChange={set('origin')} />
            </Field>
            <Field label="Treatment">
              <input className={inputCls} list="treatments" value={editing.treatment ?? ''} onChange={set('treatment')} />
              <datalist id="treatments">
                <option value="None (Untreated / Natural)" />
                <option value="Standard Heat Only" />
              </datalist>
            </Field>
            <Field label="Dimensions">
              <input className={inputCls} value={editing.dimensions ?? ''} onChange={set('dimensions')} placeholder="16.42 x 11.28 x 7.64 mm" />
            </Field>
            <Field label="Certification lab">
              <input className={inputCls} list="labs" value={editing.certification ?? ''} onChange={set('certification')} />
              <datalist id="labs">
                <option value="GIA" />
                <option value="Gübelin" />
                <option value="SSEF" />
                <option value="IGI" />
              </datalist>
            </Field>
            <Field label="Certificate number">
              <input className={inputCls} value={editing.certNumber ?? ''} onChange={set('certNumber')} />
            </Field>
            <Field label="Image URL *" className="md:col-span-2" hint="An https:// link to the photo.">
              <input className={inputCls} value={editing.image ?? ''} onChange={set('image')} placeholder="https://…" />
            </Field>
            <div className="flex items-end">
              {editing.image?.startsWith('http') && (
                <img src={editing.image} alt="Preview" className="w-24 h-24 rounded object-cover border border-[#E0D8CE] dark:border-[#332F2B]" />
              )}
            </div>
            <Field label="Description" className="md:col-span-3">
              <textarea className={inputCls} rows={4} value={editing.description ?? ''} onChange={set('description')} maxLength={4000} />
            </Field>
            <label className="flex items-center gap-2 text-sm md:col-span-3">
              <input
                type="checkbox"
                checked={!!editing.featured}
                onChange={(e) => setEditing((prev) => ({ ...prev, featured: e.target.checked }))}
              />
              Feature this stone on the home page
            </label>
          </div>
        </Panel>
      )}

      <Panel
        title={`Vault inventory (${visible.length})`}
        actions={
          <>
            <input className={`${inputCls} w-56`} placeholder="Search name, id, certificate…" value={query} onChange={(e) => setQuery(e.target.value)} />
            <label className="text-xs flex items-center gap-1.5">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
            </label>
            <Button variant="primary" onClick={() => setEditing({ ...BLANK })}>Add stone</Button>
          </>
        }
      >
        {visible.length === 0 ? (
          <Empty>No stones match.</Empty>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] border-b border-[#E8E1D9] dark:border-[#262320]">
                  <th className="py-2 pr-3">Stone</th>
                  <th className="py-2 pr-3">Carat</th>
                  <th className="py-2 pr-3">Price</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Updated</th>
                  <th className="py-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E8E1D9] dark:divide-[#262320]">
                {visible.map((s) => (
                  <tr key={s.id} className={s.archived ? 'opacity-60' : ''}>
                    <td className="py-3 pr-3">
                      <div className="flex items-center gap-3">
                        <img src={s.image} alt="" className="w-10 h-10 rounded object-cover border border-[#E0D8CE] dark:border-[#332F2B]" />
                        <div>
                          <div className="font-bold">{s.name}</div>
                          <div className="text-xs text-[#78716C] dark:text-[#A69C94]">
                            {s.id} · {s.certification} {s.certNumber} {s.featured ? '· Featured' : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 pr-3 font-mono">{s.carat}</td>
                    <td className="py-3 pr-3 font-mono">{fmtUSD(s.priceUSD)}</td>
                    <td className="py-3 pr-3 space-y-1">
                      <Pill tone={statusTone(s.status)}>{s.status}</Pill>
                      {s.archived && <Pill tone="bad">Archived</Pill>}
                      {s.status === 'Reserved' && s.reservedUntil && (
                        <div className="text-[11px] text-[#78716C] dark:text-[#A69C94]">until {fmtDate(s.reservedUntil, true)}</div>
                      )}
                    </td>
                    <td className="py-3 pr-3 text-xs">{fmtDate(s.updatedAt)}</td>
                    <td className="py-3 text-right whitespace-nowrap">
                      <Button variant="ghost" onClick={() => setEditing({ ...s })}>Edit</Button>
                      {s.archived ? (
                        <Button variant="ghost" onClick={() => restore(s)}>Restore</Button>
                      ) : (
                        <Button variant="ghost" onClick={() => archive(s)}>Archive</Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </>
  );
};

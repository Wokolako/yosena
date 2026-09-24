'use client';

import React, { useState } from 'react';
import { Gemstone } from '../../types';
import {
  adminCreateGemstone,
  adminUpdateGemstone,
  adminDeleteGemstone,
} from '../../lib/api';
import { Field, Area, Select, Toggle, Notice, PrimaryButton, GhostButton } from './adminFields';
import { ImageField } from './ImageField';
import { Plus, Pencil, Trash2, X } from 'lucide-react';

const CATEGORIES = ['Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Spinel', 'Tourmaline'] as const;
const SHAPES = ['Emerald Cut', 'Cushion', 'Round Brilliant', 'Oval', 'Pear', 'Asscher'] as const;
const STATUSES = ['In Vault', 'On Memo', 'Reserved'] as const;

/** A new stone starts here, so the required enum fields are already valid. */
const blankStone = (): Partial<Gemstone> => ({
  name: '',
  category: 'Diamond',
  shape: 'Emerald Cut',
  carat: 1,
  color: '',
  clarity: '',
  origin: '',
  treatment: 'None (Untreated / Natural)',
  certification: 'GIA',
  certNumber: '',
  priceUSD: 0,
  dimensions: '',
  image: '',
  featured: false,
  status: 'In Vault',
  description: '',
});

interface GemstoneManagerProps {
  gemstones: Gemstone[];
  /** Re-reads inventory from the server after a change lands. */
  onChanged: () => Promise<void> | void;
}

/**
 * Add, edit and remove vault stones.
 *
 * Everything shown here is what a visitor sees on the shop page, so a save is
 * immediately public. The API re-validates every field and re-derives price per
 * carat, so nothing here is load-bearing for correctness — it is the desk's
 * working surface.
 */
export const GemstoneManager: React.FC<GemstoneManagerProps> = ({ gemstones, onChanged }) => {
  const [draft, setDraft] = useState<Partial<Gemstone> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  // What the stone's photograph was when the editor opened, so a replacement
  // made mid-edit can be told apart from the saved one.
  const [originalImage, setOriginalImage] = useState<string>('');

  const set = (key: keyof Gemstone) => (value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value } : d));

  const setNumber = (key: keyof Gemstone) => (value: string) =>
    setDraft((d) => (d ? { ...d, [key]: value === '' ? '' : Number(value) } : d));

  const startAdd = () => {
    setDraft(blankStone());
    setOriginalImage('');
    setEditingId(null);
    setError(null);
    setMessage(null);
  };

  const startEdit = (stone: Gemstone) => {
    setDraft({ ...stone });
    setOriginalImage(stone.image ?? '');
    setEditingId(stone.id);
    setError(null);
    setMessage(null);
  };

  const close = () => {
    setDraft(null);
    setEditingId(null);
  };

  const save = async () => {
    if (!draft || isSaving) return;

    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      const saved = editingId
        ? await adminUpdateGemstone(editingId, draft)
        : await adminCreateGemstone(draft);

      await onChanged();
      setMessage(`"${saved.name}" saved. It is live on the site now.`);
      close();
    } catch (err: any) {
      setError(err?.message ?? 'The stone could not be saved.');
    } finally {
      setIsSaving(false);
    }
  };

  const confirmDelete = async (id: string) => {
    setIsSaving(true);
    setError(null);
    setMessage(null);

    try {
      await adminDeleteGemstone(id);
      await onChanged();
      setMessage(`Stone ${id} removed from inventory.`);
    } catch (err: any) {
      setError(err?.message ?? 'The stone could not be removed.');
    } finally {
      setIsSaving(false);
      setPendingDelete(null);
    }
  };

  const usd = (n: number) =>
    n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-xl text-[#1A1918] dark:text-[#F5F2ED]">
            Vault Inventory
          </h3>
          <p className="text-xs text-[#78716C] dark:text-[#A69C94] font-light mt-0.5">
            {gemstones.length} stones. Anything saved here appears on the public catalog immediately.
          </p>
        </div>
        <PrimaryButton onClick={startAdd}>
          <span className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" /> Add Stone
          </span>
        </PrimaryButton>
      </div>

      <Notice error={error} message={message} />

      {/* Editor */}
      {draft && (
        <div className="bg-[#FAF8F5] dark:bg-[#121110] border border-[#C5A880] rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h4 className="font-serif text-lg text-[#1A1918] dark:text-[#F5F2ED]">
              {editingId ? `Editing ${editingId}` : 'New Stone'}
            </h4>
            <button
              onClick={close}
              aria-label="Close editor"
              className="p-1.5 rounded-full text-[#57534E] dark:text-[#D5CDC4] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field
                label="Name *"
                value={draft.name ?? ''}
                onChange={set('name')}
                placeholder="14.28ct Type IIa D Flawless Emerald Cut Diamond"
              />
            </div>

            <Select
              label="Category *"
              value={draft.category ?? 'Diamond'}
              options={CATEGORIES}
              onChange={set('category')}
            />
            <Select
              label="Shape *"
              value={draft.shape ?? 'Emerald Cut'}
              options={SHAPES}
              onChange={set('shape')}
            />

            <Field
              label="Carat *"
              type="number"
              step="0.01"
              value={draft.carat ?? ''}
              onChange={setNumber('carat')}
            />
            <Field
              label="Price USD *"
              type="number"
              step="1"
              value={draft.priceUSD ?? ''}
              onChange={setNumber('priceUSD')}
            />

            <Field label="Colour" value={draft.color ?? ''} onChange={set('color')} />
            <Field label="Clarity" value={draft.clarity ?? ''} onChange={set('clarity')} />

            <Field label="Origin" value={draft.origin ?? ''} onChange={set('origin')} />
            <Field label="Treatment" value={draft.treatment ?? ''} onChange={set('treatment')} />

            <Field
              label="Certification"
              value={draft.certification ?? ''}
              onChange={set('certification')}
              placeholder="GIA"
            />
            <Field
              label="Certificate Number *"
              value={draft.certNumber ?? ''}
              onChange={set('certNumber')}
              placeholder="GIA-2235918204"
            />

            <Field
              label="Dimensions"
              value={draft.dimensions ?? ''}
              onChange={set('dimensions')}
              placeholder="16.42 x 11.28 x 7.64 mm"
            />
            <Select
              label="Status"
              value={draft.status ?? 'In Vault'}
              options={STATUSES}
              onChange={set('status')}
            />

            <div className="md:col-span-2">
              <ImageField
                value={draft.image ?? ''}
                originalValue={editingId ? originalImage : ''}
                onChange={(url) => setDraft((d) => (d ? { ...d, image: url } : d))}
              />
            </div>

            <div className="md:col-span-2">
              <Area
                label="Description"
                value={draft.description ?? ''}
                onChange={set('description')}
                rows={4}
                hint="Shown in full on the stone's detail dossier."
              />
            </div>

            <Toggle
              label="Feature on home page"
              checked={Boolean(draft.featured)}
              onChange={(checked) => setDraft((d) => (d ? { ...d, featured: checked } : d))}
            />
          </div>

          {/* Price per carat is derived server-side; showing it here keeps the
              desk from being surprised by the value that gets stored. */}
          {Number(draft.carat) > 0 && Number(draft.priceUSD) > 0 && (
            <p className="text-xs text-[#78716C] dark:text-[#A69C94] font-light">
              Price per carat will be recorded as{' '}
              <strong className="text-[#1A1918] dark:text-[#F5F2ED]">
                {usd(Math.round(Number(draft.priceUSD) / Number(draft.carat)))}
              </strong>
              .
            </p>
          )}

          <div className="flex items-center gap-3 pt-1">
            <PrimaryButton onClick={save} disabled={isSaving}>
              {isSaving ? 'Saving…' : editingId ? 'Save Changes' : 'Add to Vault'}
            </PrimaryButton>
            <GhostButton onClick={close} disabled={isSaving}>
              Cancel
            </GhostButton>
          </div>
        </div>
      )}

      {/* Inventory list */}
      <div className="space-y-2">
        {gemstones.map((stone) => (
          <div
            key={stone.id}
            className="bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs text-[#8C827A] dark:text-[#A69C94]">
                  {stone.id}
                </span>
                {stone.featured && (
                  <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#C5A880]/20 text-[#8C6D44] dark:text-[#C5A880]">
                    Featured
                  </span>
                )}
                <span className="px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider bg-[#F2ECE4] dark:bg-[#23201D] text-[#57534E] dark:text-[#D5CDC4]">
                  {stone.status}
                </span>
              </div>
              <p className="font-serif text-base text-[#1A1918] dark:text-[#F5F2ED] truncate mt-0.5">
                {stone.name}
              </p>
              <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                {stone.carat}ct · {usd(stone.priceUSD)}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {pendingDelete === stone.id ? (
                <>
                  <span className="text-xs text-[#A3524A] dark:text-[#E0897F] font-semibold">
                    Delete permanently?
                  </span>
                  <GhostButton danger onClick={() => confirmDelete(stone.id)} disabled={isSaving}>
                    Yes, delete
                  </GhostButton>
                  <GhostButton onClick={() => setPendingDelete(null)} disabled={isSaving}>
                    No
                  </GhostButton>
                </>
              ) : (
                <>
                  <GhostButton onClick={() => startEdit(stone)}>
                    <span className="flex items-center gap-1.5">
                      <Pencil className="w-3.5 h-3.5" /> Edit
                    </span>
                  </GhostButton>
                  <GhostButton danger onClick={() => setPendingDelete(stone.id)}>
                    <span className="flex items-center gap-1.5">
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </span>
                  </GhostButton>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

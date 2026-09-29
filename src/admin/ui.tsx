'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';

/* Shared building blocks for the admin console. */

export interface ApiResult<T = any> {
  ok: boolean;
  data: T | null;
  message: string | null;
  error: string | null;
}

/** Calls an admin API route. Errors come back as text for the UI, never thrown. */
export async function apiSend<T = any>(url: string, method: 'POST' | 'PATCH' | 'PUT' | 'DELETE', body?: unknown): Promise<ApiResult<T>> {
  try {
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json?.success) {
      return { ok: false, data: null, message: null, error: json?.error ?? `Request failed (${res.status}).` };
    }
    return { ok: true, data: (json.data ?? json.settings ?? null) as T, message: json.message ?? null, error: null };
  } catch {
    return { ok: false, data: null, message: null, error: 'Could not reach the server. Check your connection.' };
  }
}

/** Loads a GET resource and exposes reload(). */
export function useResource<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [extra, setExtra] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(url, { cache: 'no-store' });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.success) {
        setError(res.status === 404 ? 'Your admin session has ended. Sign in again.' : json?.error ?? 'Could not load.');
      } else {
        setData(json.data as T);
        setExtra(json);
        setError(null);
      }
    } catch {
      setError('Could not reach the server. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [url]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, extra, error, loading, reload };
}

export const fmtUSD = (n: number | null | undefined) =>
  typeof n === 'number' ? `$${Math.round(n).toLocaleString('en-US')}` : '—';

export const fmtDate = (iso: string | null | undefined, withTime = false) => {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return withTime ? d.toLocaleString() : d.toLocaleDateString();
};

export const inputCls =
  'w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3 py-2 text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880]';

export const Panel: React.FC<{ title?: React.ReactNode; actions?: React.ReactNode; children: React.ReactNode }> = ({
  title,
  actions,
  children,
}) => (
  <section className="bg-[#FFFFFF] dark:bg-[#181614] rounded-xl border border-[#E8E1D9] dark:border-[#262320] shadow-sm p-5 sm:p-6 space-y-5">
    {(title || actions) && (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {title && <h2 className="font-serif text-xl text-[#1A1918] dark:text-[#F5F2ED]">{title}</h2>}
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    {children}
  </section>
);

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost';

export const Button: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; busy?: boolean }> = ({
  variant = 'secondary',
  busy,
  className = '',
  children,
  disabled,
  ...props
}) => {
  const styles: Record<ButtonVariant, string> = {
    primary: 'bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4]',
    secondary: 'border border-[#D5CDC4] dark:border-[#38332E] text-[#1A1918] dark:text-[#F5F2ED] hover:border-[#1A1918] dark:hover:border-[#F5F2ED]',
    danger: 'border border-[#E3BCAE] dark:border-[#4A332A] text-[#8C4632] dark:text-[#D9846C] hover:bg-[#FAF3F0] dark:hover:bg-[#2A1C17]',
    ghost: 'text-[#8C6D44] dark:text-[#C5A880] hover:underline',
  };
  return (
    <button
      {...props}
      disabled={disabled || busy}
      className={`px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed ${styles[variant]} ${className}`}
    >
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  );
};

export const Field: React.FC<{ label: string; hint?: string; children: React.ReactNode; className?: string }> = ({
  label,
  hint,
  children,
  className = '',
}) => (
  <label className={`block text-xs ${className}`}>
    <span className="block uppercase tracking-wider font-bold text-[#78716C] dark:text-[#A69C94] mb-1">{label}</span>
    {children}
    {hint && <span className="block mt-1 text-[#8C827A] dark:text-[#A69C94]">{hint}</span>}
  </label>
);

type Tone = 'neutral' | 'good' | 'warn' | 'bad' | 'info';
const toneCls: Record<Tone, string> = {
  neutral: 'bg-[#F2ECE4] dark:bg-[#23201D] text-[#57534E] dark:text-[#D5CDC4]',
  good: 'bg-[#E8F5E9] dark:bg-[#1B3320] text-[#2E7D32] dark:text-[#81C784]',
  warn: 'bg-[#FEF3C7] dark:bg-[#3D2E0F] text-[#92400E] dark:text-[#FDE68A]',
  bad: 'bg-[#FAF3F0] dark:bg-[#2A1C17] text-[#8C4632] dark:text-[#D9846C]',
  info: 'bg-[#EEF2FF] dark:bg-[#1E2238] text-[#3730A3] dark:text-[#A5B4FC]',
};

export const Pill: React.FC<{ tone?: Tone; children: React.ReactNode }> = ({ tone = 'neutral', children }) => (
  <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider whitespace-nowrap ${toneCls[tone]}`}>
    {children}
  </span>
);

export const Notice: React.FC<{ tone: 'good' | 'bad' | 'warn'; children: React.ReactNode; onClose?: () => void }> = ({
  tone,
  children,
  onClose,
}) => (
  <div role={tone === 'bad' ? 'alert' : 'status'} className={`px-4 py-3 rounded-lg text-sm flex items-start justify-between gap-3 ${toneCls[tone]}`}>
    <span>{children}</span>
    {onClose && (
      <button onClick={onClose} className="text-xs font-bold uppercase cursor-pointer" aria-label="Dismiss">
        ×
      </button>
    )}
  </div>
);

export const Empty: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="py-10 text-center text-sm text-[#78716C] dark:text-[#A69C94] border border-dashed border-[#E8E1D9] dark:border-[#262320] rounded-lg">
    {children}
  </div>
);

export const Loading: React.FC = () => (
  <div className="py-10 flex justify-center text-[#C5A880]">
    <Loader2 className="w-6 h-6 animate-spin" />
  </div>
);

/** Status → colour for orders, memos, bookings, accounts and stones. */
export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (['paid', 'completed', 'confirmed', 'active', 'in vault', 'returned', 'published', 'replied'].includes(s)) return 'good';
  if (['awaiting_wire', 'pending_payment', 'processing_payment', 'pending review', 'pending', 'requested', 'reserved', 'new', 'draft'].includes(s)) return 'warn';
  if (['cancelled', 'expired', 'refunded', 'disabled', 'rejected', 'closed'].includes(s)) return 'bad';
  if (['shipped', 'on memo', 'sold', 'converted'].includes(s)) return 'info';
  return 'neutral';
}

/** Shows a result message after an action. */
export function useFlash() {
  const [flash, setFlash] = useState<{ tone: 'good' | 'bad' | 'warn'; text: string } | null>(null);
  const show = useCallback((result: ApiResult, fallback = 'Saved.') => {
    setFlash(result.ok ? { tone: 'good', text: result.message ?? fallback } : { tone: 'bad', text: result.error ?? 'Something went wrong.' });
  }, []);
  const node = flash ? (
    <Notice tone={flash.tone} onClose={() => setFlash(null)}>
      {flash.text}
    </Notice>
  ) : null;
  return { show, node, setFlash };
}

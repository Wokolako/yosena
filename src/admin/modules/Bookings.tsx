'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Panel, useResource, apiSend, useFlash, Button, Field, Pill, statusTone, fmtDate, inputCls, Loading, Notice, Empty } from '../ui';

interface AdminBooking {
  id: string;
  referenceNumber: string;
  serviceTitle: string;
  date: string;
  time: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  specificInquiry: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
}

interface Settings {
  bookingTimes: string[];
  closedDates: string[];
  bookingWindowDays: number;
}

export const BookingsModule: React.FC = () => {
  const { data: bookings, extra, error, loading, reload } = useResource<AdminBooking[]>('/api/admin/bookings');
  const flash = useFlash();
  const [showPast, setShowPast] = useState(false);
  const [times, setTimes] = useState('');
  const [closed, setClosed] = useState('');
  const [windowDays, setWindowDays] = useState(14);
  const [savingSettings, setSavingSettings] = useState(false);

  const settings: Settings | undefined = extra?.settings;
  useEffect(() => {
    if (!settings) return;
    setTimes(settings.bookingTimes.join(', '));
    setClosed(settings.closedDates.join(', '));
    setWindowDays(settings.bookingWindowDays);
  }, [settings]);

  const today = new Date().toISOString().slice(0, 10);
  const visible = useMemo(
    () =>
      (bookings ?? [])
        .filter((b) => showPast || (b.date >= today && b.status !== 'Cancelled' && b.status !== 'Completed'))
        .sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`)),
    [bookings, showPast, today]
  );

  const act = async (b: AdminBooking, body: Record<string, unknown>, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    const result = await apiSend(`/api/admin/bookings/${encodeURIComponent(b.id)}`, 'PATCH', body);
    flash.show(result, 'Booking updated.');
    if (result.ok) void reload();
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    const result = await apiSend('/api/admin/bookings', 'PUT', {
      bookingTimes: times.split(',').map((t) => t.trim()).filter(Boolean),
      closedDates: closed.split(',').map((d) => d.trim()).filter(Boolean),
      bookingWindowDays: Number(windowDays),
    });
    setSavingSettings(false);
    flash.show(result);
    if (result.ok) void reload();
  };

  if (loading && !bookings) return <Loading />;
  if (error) return <Notice tone="bad">{error}</Notice>;

  return (
    <>
      {flash.node}
      <Panel
        title={`Appointments (${visible.length})`}
        actions={
          <>
            <label className="text-xs flex items-center gap-1.5">
              <input type="checkbox" checked={showPast} onChange={(e) => setShowPast(e.target.checked)} /> Include past &amp; closed
            </label>
            <Button onClick={() => void reload()} busy={loading}>Refresh</Button>
          </>
        }
      >
        {visible.length === 0 ? <Empty>No upcoming appointments.</Empty> : (
          <div className="space-y-3">
            {visible.map((b) => <BookingRow key={b.id} booking={b} onAct={act} />)}
          </div>
        )}
      </Panel>

      <Panel title="Booking calendar" actions={<Button variant="primary" onClick={saveSettings} busy={savingSettings}>Save calendar</Button>}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Time slots (UK time)" hint="Comma-separated, e.g. 10:00 AM, 02:00 PM" className="md:col-span-2">
            <input className={inputCls} value={times} onChange={(e) => setTimes(e.target.value)} />
          </Field>
          <Field label="Days ahead that can be booked">
            <input className={inputCls} type="number" min={1} max={120} value={windowDays} onChange={(e) => setWindowDays(Number(e.target.value))} />
          </Field>
          <Field label="Closed dates" hint="Comma-separated YYYY-MM-DD, e.g. 2026-12-24, 2026-12-25. Weekends are always closed." className="md:col-span-3">
            <input className={inputCls} value={closed} onChange={(e) => setClosed(e.target.value)} />
          </Field>
        </div>
      </Panel>
    </>
  );
};

const BookingRow: React.FC<{ booking: AdminBooking; onAct: (b: AdminBooking, body: Record<string, unknown>, confirmText?: string) => Promise<void> }> = ({ booking: b, onAct }) => {
  const [date, setDate] = useState(b.date);
  const [time, setTime] = useState(b.time);
  const [notes, setNotes] = useState(b.adminNotes ?? '');
  const [rescheduling, setRescheduling] = useState(false);
  const open = b.status === 'Pending Review' || b.status === 'Confirmed';

  return (
    <div className="rounded-lg border border-[#E8E1D9] dark:border-[#262320] p-4 space-y-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-mono font-bold">{b.referenceNumber}</span>
            <Pill tone={statusTone(b.status)}>{b.status}</Pill>
          </div>
          <p className="font-bold mt-1">{b.serviceTitle}</p>
          <p>{b.date} at {b.time}</p>
          <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
            {b.clientName} ({b.companyName}) · {b.email}{b.phone ? ` · ${b.phone}` : ''} · requested {fmtDate(b.createdAt)}
          </p>
          {b.specificInquiry && <p className="text-xs mt-1">“{b.specificInquiry}”</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          {b.status === 'Pending Review' && <Button variant="primary" onClick={() => onAct(b, { action: 'confirm' })}>Confirm</Button>}
          {open && <Button onClick={() => setRescheduling(!rescheduling)}>Reschedule</Button>}
          {b.status === 'Confirmed' && <Button onClick={() => onAct(b, { action: 'complete' })}>Mark attended</Button>}
          {open && <Button variant="danger" onClick={() => onAct(b, { action: 'cancel' }, `Cancel ${b.referenceNumber}?`)}>Cancel</Button>}
          <a
            className="px-3.5 py-2 rounded text-xs font-bold uppercase tracking-wider text-[#8C6D44] dark:text-[#C5A880] hover:underline"
            href={`mailto:${b.email}?subject=${encodeURIComponent(`Your YosenaMora appointment ${b.referenceNumber}`)}`}
          >
            Email client
          </a>
        </div>
      </div>

      {rescheduling && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
          <Field label="New date"><input className={inputCls} type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
          <Field label="New time"><input className={inputCls} value={time} onChange={(e) => setTime(e.target.value)} /></Field>
          <Button variant="primary" onClick={() => onAct(b, { action: 'reschedule', date, time })}>Save new time</Button>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
        <Field label="Internal notes" className="sm:col-span-3">
          <textarea className={inputCls} rows={1} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </Field>
        <Button onClick={() => onAct(b, { action: 'note', adminNotes: notes })}>Save notes</Button>
      </div>
    </div>
  );
};

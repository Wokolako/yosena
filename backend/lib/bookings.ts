import type { BookingRecord, SettingsDoc } from '../store/db';

/** Appointment calendar: weekdays in the booking window, in London time, minus admin-closed dates. */

const TZ = 'Europe/London';

export function londonDate(d: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

function display(date: string): string {
  const d = new Date(`${date}T12:00:00Z`);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });
}

export function bookableDates(settings: SettingsDoc, now = new Date()): string[] {
  const closed = new Set(settings.closedDates || []);
  const dates: string[] = [];
  const today = londonDate(now);
  for (let offset = 1; offset <= (settings.bookingWindowDays || 14); offset++) {
    const date = londonDate(new Date(Date.parse(`${today}T12:00:00Z`) + offset * 86_400_000));
    const weekday = new Date(`${date}T12:00:00Z`).getUTCDay();
    if (weekday === 0 || weekday === 6 || closed.has(date)) continue;
    dates.push(date);
  }
  return dates;
}

export function calendar(settings: SettingsDoc, bookings: BookingRecord[], now = new Date()) {
  const taken = new Set(
    bookings.filter((b) => b.status !== 'Cancelled').map((b) => `${b.date}|${b.time}`)
  );
  return bookableDates(settings, now).map((date) => ({
    date,
    display: display(date),
    slots: (settings.bookingTimes || []).map((time) => ({ time, available: !taken.has(`${date}|${time}`) })),
  }));
}

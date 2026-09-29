import React, { useState, useEffect } from 'react';
import { useSiteData } from '../context/SiteDataContext';
import { useAuth } from '../context/AuthContext';
import { ConsultationService } from '../types';
import { CONTACT_EMAIL } from '../lib/contact';
import { Clock, CheckCircle2, User, Building, Mail, Phone, ArrowRight, Shield, Loader2, AlertCircle } from 'lucide-react';

interface CalendarDay {
  date: string;
  display: string;
  slots: { time: string; available: boolean }[];
}

interface BookingConfirmation {
  referenceNumber: string;
  serviceTitle: string;
  date: string;
  time: string;
  clientName: string;
  companyName: string;
  email: string;
  status: string;
}

export const BookingSection: React.FC = () => {
  const { services: CONSULTATION_SERVICES } = useSiteData();
  const { user } = useAuth();
  const [selectedService, setSelectedService] = useState<ConsultationService | null>(CONSULTATION_SERVICES[0] ?? null);
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [calendarError, setCalendarError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedTime, setSelectedTime] = useState<string>('');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingConfirmation | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientName: user?.clientName ?? '',
    companyName: user?.companyName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    specificInquiry: '',
  });

  // Open dates and times come from the server, so booked or closed slots are never offered.
  const loadCalendar = async () => {
    try {
      const res = await fetch('/api/bookings/slots', { cache: 'no-store' });
      const data = await res.json();
      if (!res.ok || !data?.success) throw new Error(data?.error);
      const days: CalendarDay[] = data.dates;
      setCalendar(days);
      setCalendarError(null);
      const firstOpen = days.find((d) => d.slots.some((s) => s.available));
      setSelectedDate((current) =>
        days.some((d) => d.date === current && d.slots.some((s) => s.available)) ? current : firstOpen?.date ?? ''
      );
    } catch {
      setCalendarError('The appointment calendar could not be loaded. Please try again shortly.');
    }
  };

  useEffect(() => {
    void loadCalendar();
  }, []);

  const availableDates = calendar.filter((d) => d.slots.some((s) => s.available));
  const availableTimes = (calendar.find((d) => d.date === selectedDate)?.slots ?? [])
    .filter((s) => s.available)
    .map((s) => s.time);

  // Keep the chosen time valid for the chosen date.
  useEffect(() => {
    if (!availableTimes.includes(selectedTime)) setSelectedTime(availableTimes[0] ?? '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, calendar]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.email || !selectedService || !selectedDate || !selectedTime || submitting) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceId: selectedService.id, date: selectedDate, time: selectedTime, ...formData }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.success) {
        setSubmitError(data?.error ?? 'Your request could not be sent. Please try again.');
        if (res.status === 409 || res.status === 400) void loadCalendar();
        return;
      }
      setConfirmedBooking(data.data);
      void loadCalendar();
    } catch {
      setSubmitError('Could not reach the trade desk. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const displayDate = (date: string) => calendar.find((d) => d.date === date)?.display ?? date;

  return (
    <div className="py-12 lg:py-20 bg-[#FAF8F5] dark:bg-[#0F0E0D] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-2xl mx-auto mb-14 space-y-2">
          <span className="text-xs sm:text-sm uppercase tracking-[0.3em] text-[#8C827A] dark:text-[#A69C94] font-bold">
            Bespoke Services &amp; Consultations
          </span>
          <h1 className="font-serif text-3xl sm:text-5xl text-[#1A1918] dark:text-[#F5F2ED] font-normal">
            Private Gemological Appointments
          </h1>
          <p className="text-sm sm:text-base text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed">
            Schedule a private viewing in our London or Geneva vault suites, or request a digital macro-appraisal session for custom jewelry commissions.
          </p>
        </div>

        {confirmedBooking ? (
          /* Confirmation State */
          <div className="max-w-2xl mx-auto bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-xl p-8 sm:p-10 shadow-xl text-center space-y-6 animate-in zoom-in-95">
            <div className="w-16 h-16 bg-[#FAF8F5] dark:bg-[#23201D] border border-[#C5A880] text-[#1A1918] rounded-full mx-auto flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#C5A880]" />
            </div>

            <div className="space-y-2">
              <span className="text-xs sm:text-sm uppercase tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94] font-bold">
                Request Received
              </span>
              <h2 className="font-serif text-3xl text-[#1A1918] dark:text-[#F5F2ED]">
                Your Request Is With the Trade Desk
              </h2>
              <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94]">
                Official Reference: <span className="font-mono font-bold text-[#1A1918] dark:text-[#F5F2ED]">{confirmedBooking.referenceNumber}</span>
              </p>
            </div>

            <div className="bg-[#FAF8F5] dark:bg-[#121110] p-5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] text-left space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between py-1.5 border-b border-[#E8E1D9] dark:border-[#262320]">
                <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Service:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] text-right">{confirmedBooking.serviceTitle}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E8E1D9] dark:border-[#262320]">
                <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Date &amp; Time:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{displayDate(confirmedBooking.date)} at {confirmedBooking.time} (UK time)</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E8E1D9] dark:border-[#262320]">
                <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Attendee:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{confirmedBooking.clientName} ({confirmedBooking.companyName})</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Confirmation Will Go To:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{confirmedBooking.email}</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] font-light">
              The trade desk will confirm this slot by email, usually within one business day. For immediate changes, reach our desk directly at <span className="text-[#1A1918] dark:text-[#F5F2ED] font-semibold">{CONTACT_EMAIL}</span>.
            </div>

            <button
              onClick={() => setConfirmedBooking(null)}
              className="px-8 py-3.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded text-xs sm:text-sm uppercase tracking-wider font-bold hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors cursor-pointer"
            >
              Book Another Consultation
            </button>
          </div>
        ) : (
          /* Interactive Booking Flow */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Step 1: Select Consultation Service */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold text-[#1A1918] dark:text-[#F5F2ED] pb-2 border-b border-[#E8E1D9] dark:border-[#262320] flex items-center gap-2">
                <span>01. Select Consultation Tier</span>
              </h3>

              <div className="space-y-3">
                {CONSULTATION_SERVICES.map((service) => {
                  const isSelected = selectedService?.id === service.id;
                  return (
                    <div
                      key={service.id}
                      onClick={() => setSelectedService(service)}
                      className={`p-5 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-[#FFFFFF] dark:bg-[#181614] border-[#1A1918] dark:border-[#C5A880] shadow-md ring-1 ring-[#1A1918] dark:ring-[#C5A880]'
                          : 'bg-[#FFFFFF] dark:bg-[#181614] border-[#E8E1D9] dark:border-[#262320] hover:border-[#C5A880]'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2.5 py-0.5 rounded text-xs uppercase font-bold tracking-wider bg-[#FAF8F5] dark:bg-[#23201D] border border-[#E5DFD7] dark:border-[#38332E] text-[#1A1918] dark:text-[#F5F2ED]">
                          {service.type}
                        </span>
                        <span className="text-xs text-[#78716C] dark:text-[#A69C94] font-medium flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> {service.duration}
                        </span>
                      </div>

                      <h4 className="font-serif text-lg sm:text-xl text-[#1A1918] dark:text-[#F5F2ED] mb-1 font-normal">
                        {service.title}
                      </h4>

                      <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4] font-light leading-relaxed mb-3">
                        {service.description}
                      </p>

                      <div className="pt-2 border-t border-[#F2ECE4] dark:border-[#262320] flex items-center justify-between text-xs sm:text-sm">
                        <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Fee:</span>
                        <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{service.fee}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-4 rounded-lg bg-[#FAF8F5] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4] flex items-start gap-2.5">
                <Shield className="w-4 h-4 text-[#C5A880] shrink-0 mt-0.5" />
                <p className="font-light leading-relaxed">
                  All appointments include bilateral Non-Disclosure protection. Your client designs and CAD files remain 100% confidential.
                </p>
              </div>
            </div>

            {/* Step 2: Calendar & Timeslot Picker */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold text-[#1A1918] dark:text-[#F5F2ED] pb-2 border-b border-[#E8E1D9] dark:border-[#262320] flex items-center gap-2">
                <span>02. Select Date &amp; Time Slot</span>
              </h3>

              {/* Date selection grid */}
              <div className="bg-[#FFFFFF] dark:bg-[#181614] p-5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] space-y-4">
                <span className="text-xs sm:text-sm uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-bold">
                  Available Dates
                </span>
                
                {calendarError && (
                  <p className="text-xs text-[#8C4632] dark:text-[#D9846C] font-semibold">{calendarError}</p>
                )}
                {!calendarError && calendar.length > 0 && availableDates.length === 0 && (
                  <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                    All slots are taken for now. Please contact {CONTACT_EMAIL}.
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {availableDates.map((item) => (
                    <button
                      key={item.date}
                      type="button"
                      onClick={() => setSelectedDate(item.date)}
                      className={`p-3 rounded text-left border transition-all cursor-pointer ${
                        selectedDate === item.date
                          ? 'border-[#1A1918] dark:border-[#C5A880] bg-[#1A1918] dark:bg-[#C5A880] text-[#FAF8F5] dark:text-[#141413] shadow-sm'
                          : 'border-[#E8E1D9] dark:border-[#282421] bg-[#FAF8F5] dark:bg-[#121110] text-[#1A1918] dark:text-[#F5F2ED] hover:border-[#1A1918] dark:hover:border-[#C5A880]'
                      }`}
                    >
                      <span className="block text-xs sm:text-sm font-bold">{item.display}</span>
                      <span className={`text-xs ${selectedDate === item.date ? 'text-[#C5A880] dark:text-[#141413]' : 'text-[#78716C] dark:text-[#A69C94]'}`}>
                        Vault Open
                      </span>
                    </button>
                  ))}
                </div>

                {/* Timeslots */}
                <div className="pt-4 border-t border-[#F2ECE4] dark:border-[#262320] space-y-2">
                  <span className="text-xs sm:text-sm uppercase tracking-wider text-[#8C827A] dark:text-[#A69C94] block font-bold">
                    Select Convenient Time Slot (UK time)
                  </span>
                  <div className="grid grid-cols-1 gap-2">
                    {availableTimes.map((time) => (
                      <button
                        key={time}
                        type="button"
                        onClick={() => setSelectedTime(time)}
                        className={`p-3 rounded text-xs sm:text-sm text-left border flex items-center justify-between transition-all cursor-pointer ${
                          selectedTime === time
                            ? 'border-[#C5A880] bg-[#C5A880]/15 text-[#1A1918] dark:text-[#F5F2ED] font-bold'
                            : 'border-[#E8E1D9] dark:border-[#282421] bg-[#FFFFFF] dark:bg-[#121110] text-[#57534E] dark:text-[#D5CDC4] hover:border-[#1A1918] dark:hover:border-[#F5F2ED]'
                        }`}
                      >
                        <span className="flex items-center gap-2 font-medium">
                          <Clock className="w-4 h-4 text-[#C5A880]" /> {time}
                        </span>
                        {selectedTime === time && (
                          <CheckCircle2 className="w-4 h-4 text-[#C5A880]" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="text-xs text-[#78716C] dark:text-[#A69C94] italic pt-2">
                  Note: Vault viewing locations available in Hatton Garden (London) and Rue du Rhône (Genève).
                </div>
              </div>
            </div>

            {/* Step 3: Booking Form */}
            <div className="lg:col-span-4 space-y-4">
              <h3 className="text-xs sm:text-sm uppercase tracking-[0.2em] font-bold text-[#1A1918] dark:text-[#F5F2ED] pb-2 border-b border-[#E8E1D9] dark:border-[#262320] flex items-center gap-2">
                <span>03. Jeweller Credentials &amp; Request</span>
              </h3>

              <form onSubmit={handleSubmit} className="bg-[#FFFFFF] dark:bg-[#181614] p-6 rounded-lg border border-[#E8E1D9] dark:border-[#262320] space-y-4 shadow-sm">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">
                    Contact Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-[#8C827A] dark:text-[#A69C94] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={formData.clientName}
                      onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                      placeholder="e.g. Master Jeweller Arthur Sterling"
                      className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">
                    Atelier / Company Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-[#8C827A] dark:text-[#A69C94] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={formData.companyName}
                      onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                      placeholder="e.g. Sterling Fine Jewels Ltd"
                      className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">
                    Business Email *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-[#8C827A] dark:text-[#A69C94] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="jeweller@atelier.com"
                      className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">
                    Direct Phone / WhatsApp
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-[#8C827A] dark:text-[#A69C94] absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+44 20 7946 0912"
                      className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded pl-9 pr-3 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">
                    Specific Stones or Parcel Parameters
                  </label>
                  <textarea
                    rows={3}
                    value={formData.specificInquiry}
                    onChange={(e) => setFormData({ ...formData, specificInquiry: e.target.value })}
                    placeholder="e.g. Seeking matching 5ct+ unheated Ceylon cushion pair, or inspecting the 14ct Type IIa diamond..."
                    className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded p-3 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880]"
                  />
                </div>

                {submitError && (
                  <div role="alert" className="flex items-start gap-2 text-xs text-[#8C4632] dark:text-[#D9846C] font-semibold">
                    <AlertCircle className="w-4 h-4 shrink-0" /> <span>{submitError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !selectedService || !selectedDate || !selectedTime}
                  className="w-full py-3.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] rounded text-xs sm:text-sm uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                  <span>Request Appointment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

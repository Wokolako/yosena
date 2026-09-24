'use client';

import React, { useEffect, useState } from 'react';
import { ConsultationService, BookingAppointment } from '../types';
import { fetchServices, createBooking } from '../lib/api';
import { Clock, CheckCircle2, User, Building, Mail, Phone, ArrowRight, Shield } from 'lucide-react';

interface BookingSectionProps {
  onBookingComplete?: (booking: BookingAppointment) => void;
}

export const BookingSection: React.FC<BookingSectionProps> = ({ onBookingComplete }) => {
  const [services, setServices] = useState<ConsultationService[]>([]);
  const [selectedService, setSelectedService] = useState<ConsultationService | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState<boolean>(true);
  const [selectedDate, setSelectedDate] = useState<string>('2026-09-18');
  const [selectedTime, setSelectedTime] = useState<string>('11:30 AM BST');
  const [confirmedBooking, setConfirmedBooking] = useState<BookingAppointment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // The first tier is preselected so the form is usable the moment it renders.
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const data = await fetchServices();
        if (!cancelled) {
          setServices(data);
          setSelectedService(data[0] ?? null);
          setSubmitError(null);
        }
      } catch (err: any) {
        if (!cancelled) setSubmitError(err?.message ?? 'Could not load consultation tiers.');
      } finally {
        if (!cancelled) setIsLoadingServices(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const [formData, setFormData] = useState({
    clientName: '',
    companyName: '',
    email: '',
    phone: '',
    specificInquiry: '',
  });

  const availableDates = [
    { date: '2026-09-18', display: 'Fri, Sep 18' },
    { date: '2026-09-21', display: 'Mon, Sep 21' },
    { date: '2026-09-22', display: 'Tue, Sep 22' },
    { date: '2026-09-23', display: 'Wed, Sep 23' },
    { date: '2026-09-24', display: 'Thu, Sep 24' },
    { date: '2026-09-25', display: 'Fri, Sep 25' },
  ];

  const availableTimes = [
    '10:00 AM BST',
    '11:30 AM BST',
    '02:00 PM BST',
    '03:30 PM BST',
    '05:00 PM BST',
  ];

  // The reference number and id are issued by the trade desk, not invented here,
  // so the confirmation screen shows the record that was actually persisted.
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.clientName || !formData.email || !selectedService || isSubmitting) return;

    setIsSubmitting(true);
    setSubmitError(null);

    try {
      const appointment = await createBooking({
        serviceId: selectedService.id,
        serviceTitle: selectedService.title,
        date: selectedDate,
        time: selectedTime,
        clientName: formData.clientName,
        companyName: formData.companyName || 'Independent Atelier',
        email: formData.email,
        phone: formData.phone || 'N/A',
        specificInquiry: formData.specificInquiry,
      });

      setConfirmedBooking(appointment);
      if (onBookingComplete) {
        onBookingComplete(appointment);
      }
    } catch (err: any) {
      setSubmitError(err?.message ?? 'The appointment could not be registered.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
                Appointment Confirmed
              </span>
              <h2 className="font-serif text-3xl text-[#1A1918] dark:text-[#F5F2ED]">
                We Look Forward to Welcoming You
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
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{confirmedBooking.date} at {confirmedBooking.time}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#E8E1D9] dark:border-[#262320]">
                <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Attendee:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{confirmedBooking.clientName} ({confirmedBooking.companyName})</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#8C827A] dark:text-[#A69C94] font-medium">Confirmation Sent:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{confirmedBooking.email}</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] font-light">
              A private gemological specialist has been assigned to prepare your parcel requests. For immediate changes, reach our desk directly at <span className="text-[#1A1918] dark:text-[#F5F2ED] font-semibold">consult@yosenamora.com</span>.
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
                {isLoadingServices && (
                  <p role="status" className="text-xs sm:text-sm font-light text-[#8C827A] dark:text-[#A69C94] py-6">
                    Loading consultation tiers&hellip;
                  </p>
                )}

                {!isLoadingServices && services.length === 0 && (
                  <p role="alert" className="text-xs sm:text-sm font-light text-[#A3524A] dark:text-[#E0897F] py-6">
                    No consultation tiers are open for booking right now.
                  </p>
                )}

                {services.map((service) => {
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
                  Available Dates (Next 14 Days)
                </span>
                
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
                    Select Convenient Time Slot
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
                  <p role="alert" className="text-xs sm:text-sm font-light text-[#A3524A] dark:text-[#E0897F]">
                    {submitError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isSubmitting || !selectedService}
                  className="w-full py-3.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] rounded text-xs sm:text-sm uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>{isSubmitting ? 'Registering…' : 'Confirm Appointment'}</span>
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

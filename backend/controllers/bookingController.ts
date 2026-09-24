import { Request, Response } from 'express';
import { db, BookingData } from '../data/db';

export const bookingController = {
  async createBooking(req: Request, res: Response): Promise<void> {
    try {
      const {
        serviceId,
        serviceTitle,
        date,
        time,
        clientName,
        companyName,
        email,
        phone,
        specificInquiry
      } = req.body;

      if (!serviceTitle || !date || !time || !clientName || !email) {
        res.status(400).json({
          success: false,
          error: 'Service title, appointment date, time, client name, and email are required.'
        });
        return;
      }

      const referenceNumber = `SA-VAULT-${Math.floor(1000 + Math.random() * 9000)}`;
      const newBooking: BookingData = {
        id: `BK-${Date.now()}`,
        serviceId: serviceId || 'vault-consultation',
        serviceTitle: serviceTitle.trim(),
        date: date.trim(),
        time: time.trim(),
        clientName: clientName.trim(),
        companyName: (companyName || 'Private Collector / Independent Atelier').trim(),
        email: email.trim().toLowerCase(),
        phone: (phone || '').trim(),
        specificInquiry: (specificInquiry || '').trim(),
        status: 'Confirmed',
        referenceNumber,
        createdAt: new Date().toISOString()
      };

      const saved = await db.createBooking(newBooking);

      res.status(201).json({
        success: true,
        message: 'Consultation appointment scheduled and confirmed.',
        data: saved
      });
    } catch (err: any) {
      res.status(500).json({
        success: false,
        error: 'Failed to create booking.',
        details: err?.message
      });
    }
  },

  async getBookings(req: Request, res: Response): Promise<void> {
    try {
      const { email, status } = req.query;
      let bookings = email
        ? await db.getBookingsByEmail(String(email))
        : await db.getBookings();

      if (status) {
        bookings = bookings.filter((b) => b.status.toLowerCase() === String(status).toLowerCase());
      }

      res.status(200).json({
        success: true,
        count: bookings.length,
        data: bookings
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve bookings.' });
    }
  },

  async getBookingById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const booking = await db.getBookingByIdOrReference(id);

      if (!booking) {
        res.status(404).json({ success: false, error: 'Booking appointment not found.' });
        return;
      }

      res.status(200).json({ success: true, data: booking });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to fetch booking.' });
    }
  },

  async cancelBooking(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const cancelled = await db.updateBookingStatus(id, 'Cancelled');

      if (!cancelled) {
        res.status(404).json({ success: false, error: 'Booking appointment not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Appointment cancelled successfully.',
        data: cancelled
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to cancel appointment.' });
    }
  },

  async getAvailableSlots(req: Request, res: Response): Promise<void> {
    try {
      const date = String(req.query.date || '2026-09-18');
      const standardSlots = [
        '10:00 AM BST',
        '11:30 AM BST',
        '02:00 PM BST',
        '03:30 PM BST',
        '05:00 PM BST'
      ];

      const bookedSlots = (await db.getBookingsOnDate(date)).map((b) => b.time);

      const available = standardSlots.map((slot) => ({
        time: slot,
        isAvailable: !bookedSlots.includes(slot)
      }));

      res.status(200).json({
        success: true,
        date,
        slots: available
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve available slots.' });
    }
  }
};

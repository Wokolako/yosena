import { Router } from 'express';
import { bookingController } from '../controllers/bookingController';
import { authenticateToken, requireRole } from '../auth/authMiddleware';

const router = Router();

// Public consultation booking
router.post('/', bookingController.createBooking);
router.get('/slots', bookingController.getAvailableSlots);

// A booking record carries the client's name, company, email and phone, and
// cancelling one is a change to the desk's diary. Both are for the desk: ids
// are minted from a timestamp, so neither should be reachable by guessing one.
router.get('/:id', authenticateToken, requireRole(['admin']), bookingController.getBookingById);
router.post('/:id/cancel', authenticateToken, requireRole(['admin']), bookingController.cancelBooking);

// Protected trade desk inspection appointments
router.get('/', authenticateToken, requireRole(['admin']), bookingController.getBookings);

export default router;

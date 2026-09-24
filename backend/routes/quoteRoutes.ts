import { Router } from 'express';
import { quoteController } from '../controllers/quoteController';
import { authenticateToken, requireRole } from '../auth/authMiddleware';

const router = Router();

// Public wholesale calculation & inquiry submission
router.post('/calculate', quoteController.calculateQuote);
router.post('/submit', quoteController.submitQuoteRequest);

// Protected trade desk review
router.get('/', authenticateToken, requireRole(['admin']), quoteController.getQuoteRequests);

export default router;

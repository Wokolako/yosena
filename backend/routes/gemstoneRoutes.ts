import { Router } from 'express';
import { gemstoneController } from '../controllers/gemstoneController';
import { authenticateToken, requireRole } from '../auth/authMiddleware';

const router = Router();

// Public catalog endpoints
router.get('/', gemstoneController.getAllGemstones);
router.get('/featured', gemstoneController.getFeatured);
router.get('/:id', gemstoneController.getGemstoneById);

// Protected inventory modification endpoints
router.patch('/:id/status', authenticateToken, requireRole(['admin']), gemstoneController.updateStatus);
router.post('/', authenticateToken, requireRole(['admin']), gemstoneController.createGemstone);

export default router;

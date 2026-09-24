import { Router } from 'express';
import { authController } from '../controllers/authController';
import { authenticateToken } from '../auth/authMiddleware';

const router = Router();

// Sign-in and sign-up are handled by Clerk, not by this API. What remains is
// the trade profile that sits alongside the Clerk account.
router.get('/me', authenticateToken, authController.getProfile);
router.put('/profile', authenticateToken, authController.updateProfile);

export default router;

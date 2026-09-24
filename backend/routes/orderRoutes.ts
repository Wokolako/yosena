import { Router } from 'express';
import { orderController } from '../controllers/orderController';
import { authenticateToken, requireRole } from '../auth/authMiddleware';

const router = Router();

// Checkout is open to guests, exactly as it is on the Next side.
router.post('/', orderController.createOrder);

// The order book is desk material. Note that getOrders scopes its results with
// `if (req.user && ...)` — without authenticateToken in front of it, req.user
// is always undefined and the scoping silently falls through to every order.
router.get('/', authenticateToken, requireRole(['admin']), orderController.getOrders);
router.get('/:id', authenticateToken, requireRole(['admin']), orderController.getOrderById);

export default router;

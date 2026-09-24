import { Router } from 'express';
import { memoController } from '../controllers/memoController';
import { authenticateToken, requireRole } from '../auth/authMiddleware';

const router = Router();

// Memo consignments are exclusive to verified trade partner members
router.use(authenticateToken);

router.get('/', memoController.getMemberMemos);
router.post('/request', memoController.requestMemo);

// Advancing a memo is a custody decision, and 'Returned to Vault' releases the
// stone back onto the public floor. A session alone is not enough, and there is
// no ownership check here either, so this is the desk's call.
router.patch('/:id/status', requireRole(['admin']), memoController.updateMemoStatus);

export default router;

import { Response } from 'express';
import { db, MemoData } from '../data/db';
import { AuthenticatedRequest } from '../auth/authMiddleware';

export const memoController = {
  async getMemberMemos(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Scoped to the caller unless they are an admin.
      if (req.user && req.user.accountRole !== 'admin') {
        const userMemos = await db.getMemosForUser(req.user.id, req.user.memberId);
        res.status(200).json({
          success: true,
          count: userMemos.length,
          data: userMemos
        });
        return;
      }

      const memos = await db.getMemos();

      res.status(200).json({
        success: true,
        count: memos.length,
        data: memos
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to retrieve memo consignments.' });
    }
  },

  async requestMemo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // The route is behind authenticateToken, so this is a guard rather than a
      // fallback: a consignment must never be booked against a guessed account.
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const { stoneId, notes } = req.body;

      if (!stoneId) {
        res.status(400).json({
          success: false,
          error: 'Gemstone ID (stoneId) is required to issue a consignment memo.'
        });
        return;
      }

      const stone = await db.getGemstoneById(stoneId);

      if (!stone) {
        res.status(404).json({ success: false, error: 'Gemstone not found in vault.' });
        return;
      }

      if (stone.status === 'On Memo') {
        res.status(409).json({
          success: false,
          error: 'This gemstone is currently on active memo with another trade atelier.'
        });
        return;
      }

      const memoId = `MEMO-${Math.floor(8000 + Math.random() * 2000)}`;
      const trackingCode = `FER-${Math.floor(1000000 + Math.random() * 9000000)}-UK`;

      const newMemo: MemoData = {
        id: memoId,
        userId: req.user.id,
        memberId: req.user.memberId,
        companyName: req.user.companyName,
        stoneId: stone.id,
        stoneName: stone.name,
        dateDispatched: new Date().toISOString().split('T')[0],
        daysRemaining: 14,
        courier: 'Ferrari Logistics (Armored Courier)',
        tracking: trackingCode,
        declaredValueUSD: stone.priceUSD,
        status: 'Consignment Approved - Dispatching',
        notes: notes || 'Inspection memo requested for client presentation.',
        createdAt: new Date().toISOString()
      };

      // Records the memo and flips the stone to 'On Memo' in one transaction.
      const saved = await db.createMemo(newMemo);

      res.status(201).json({
        success: true,
        message: 'Memo consignment request confirmed. Armored logistics dispatched.',
        data: saved
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to process memo request.' });
    }
  },

  async updateMemoStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status, notes } = req.body;

      if (!status) {
        res.status(400).json({ success: false, error: 'Status is required.' });
        return;
      }

      // A returned memo releases the stone back to the vault in the same write.
      const updated = await db.updateMemoStatus(
        id,
        status,
        notes,
        status === 'Returned to Vault'
      );

      if (!updated) {
        res.status(404).json({ success: false, error: 'Memo not found.' });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Memo ${id} updated to '${status}'.`,
        data: updated
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: 'Failed to update memo status.' });
    }
  }
};

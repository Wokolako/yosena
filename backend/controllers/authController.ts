import { Response } from 'express';
import { db } from '../data/db';
import { AuthenticatedRequest } from '../auth/authMiddleware';

/**
 * Trade profile endpoints.
 *
 * There is no login or register here any more: Clerk owns credentials, sign-in
 * and sign-up. What remains is the trade relationship this app keeps — member
 * id, tier, credit line, role, saved stones and notification preferences.
 */
export const authController = {
  async getProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      res.status(200).json({ success: true, user: req.user });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
    }
  },

  async updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ success: false, error: 'Unauthorized.' });
        return;
      }

      const currentUser = req.user;
      const { phone, address, preferences, savedStoneIds } = req.body;

      await db.updateUserProfile(currentUser.id, {
        phone: phone !== undefined ? phone : currentUser.phone,
        address: address !== undefined ? address : currentUser.address,
        preferences:
          preferences !== undefined
            ? { ...currentUser.preferences, ...preferences }
            : currentUser.preferences,
      });

      // The shortlist is a join table, so it is replaced as a set rather than
      // written back as a column.
      if (Array.isArray(savedStoneIds)) {
        await db.replaceSavedStones(currentUser.id, savedStoneIds);
      }

      const updated = await db.getUserById(currentUser.id);

      res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        user: updated
      });
    } catch {
      res.status(500).json({ success: false, error: 'Failed to update profile.' });
    }
  }
};

import { Response, NextFunction } from 'express';
import type { Request } from 'express';
import { getAuth } from '@clerk/express';
import { db, UserData } from '../data/db';

/**
 * Clerk-backed request authentication for the standalone Express API.
 *
 * Identity comes from the Clerk session that `clerkMiddleware()` attaches in
 * server.ts. Role, member id and credit line are then read from this app's own
 * database rather than trusted from anything the client sent — the request
 * carries no claims of its own.
 */
export interface AuthenticatedRequest extends Request {
  /** The caller's trade record, set once authentication succeeds. */
  user?: UserData;
}

export async function authenticateToken(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { userId } = getAuth(req);

    if (!userId) {
      res.status(401).json({
        success: false,
        error: 'Authentication required. Sign in to continue.'
      });
      return;
    }

    const user = await db.getUserByClerkId(userId);

    if (!user) {
      // Authenticated with Clerk but no trade record yet. The Next app
      // provisions one on first visit to the vault; this API does not create
      // accounts as a side effect of an arbitrary request.
      res.status(403).json({
        success: false,
        error: 'No trade account is linked to this sign-in.'
      });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(allowedRoles: Array<'trade_partner' | 'admin' | 'jeweller'>) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({
        success: false,
        error: 'Unauthorized. Authentication is required.'
      });
      return;
    }

    if (!allowedRoles.includes(req.user.accountRole)) {
      res.status(403).json({
        success: false,
        error: `Forbidden. This action requires one of the following roles: ${allowedRoles.join(', ')}`
      });
      return;
    }

    next();
  };
}

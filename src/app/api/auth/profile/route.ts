import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireUser, toPublicUser } from '@backend/auth/session';
import { handle, ok, readJson, assertSameOrigin } from '@backend/lib/http';
import * as v from '@backend/lib/validate';

/** A member may change only their own contact details, alert preferences and saved stones. */
export const PUT = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  const me = await requireUser();
  const body = await readJson(req, 16_000);

  const phone = body.phone !== undefined ? v.str(body.phone, 'Phone', { max: 40 }) : undefined;
  const address = body.address !== undefined ? v.str(body.address, 'Address', { max: 300 }) : undefined;
  const savedStoneIds = body.savedStoneIds !== undefined ? v.stringArray(body.savedStoneIds, 'Saved stones', { max: 200 }) : undefined;
  const prefs = body.preferences && typeof body.preferences === 'object' ? body.preferences : undefined;

  const updated = db.transaction((tx) => {
    const users = tx.get('users');
    const user = users.find((u) => u.id === me.id)!;
    if (phone !== undefined) user.phone = phone;
    if (address !== undefined) user.address = address;
    if (savedStoneIds !== undefined) {
      const known = new Set(tx.get('gemstones').map((s) => s.id));
      user.savedStoneIds = Array.from(new Set(savedStoneIds.filter((id) => known.has(id))));
    }
    if (prefs) {
      user.preferences = {
        notifyDrops: prefs.notifyDrops !== undefined ? !!prefs.notifyDrops : user.preferences?.notifyDrops ?? true,
        notifyMemos: prefs.notifyMemos !== undefined ? !!prefs.notifyMemos : user.preferences?.notifyMemos ?? true,
      };
    }
    user.updatedAt = new Date().toISOString();
    tx.set('users', users);
    return user;
  });

  return ok({ message: 'Profile updated.', user: toPublicUser(updated) });
});

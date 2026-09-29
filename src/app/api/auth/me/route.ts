import { getSessionUser, toPublicUser } from '@backend/auth/session';
import { handle, ok, fail } from '@backend/lib/http';

export const GET = handle(async () => {
  const user = await getSessionUser();
  if (!user) return fail(401, 'Not signed in.');
  return ok({ user: toPublicUser(user) });
});

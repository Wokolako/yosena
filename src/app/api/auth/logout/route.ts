import { NextRequest } from 'next/server';
import { endSession } from '@backend/auth/session';
import { handle, ok, assertSameOrigin } from '@backend/lib/http';

export const POST = handle(async (req: NextRequest) => {
  assertSameOrigin(req);
  await endSession();
  return ok({});
});

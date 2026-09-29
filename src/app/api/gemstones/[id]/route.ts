import { NextRequest } from 'next/server';
import { publicStones } from '@backend/lib/commerce';
import { handle, ok, HttpError } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const stone = publicStones().find((s) => s.id === id);
  if (!stone) throw new HttpError(404, 'Gemstone not found.');
  return ok({ data: stone });
});

import { NextRequest } from 'next/server';
import { publicStones } from '@backend/lib/commerce';
import { handle, ok } from '@backend/lib/http';

export const dynamic = 'force-dynamic';

export const GET = handle(async (req: NextRequest) => {
  const params = new URL(req.url).searchParams;
  let stones = publicStones();

  const category = params.get('category');
  const shape = params.get('shape');
  const status = params.get('status');
  const featured = params.get('featured');
  const search = params.get('search')?.toLowerCase();
  const minCarat = Number(params.get('minCarat'));
  const maxCarat = Number(params.get('maxCarat'));
  const minPrice = Number(params.get('minPrice'));
  const maxPrice = Number(params.get('maxPrice'));

  if (category && category !== 'All') stones = stones.filter((s) => s.category.toLowerCase() === category.toLowerCase());
  if (shape) stones = stones.filter((s) => s.shape.toLowerCase() === shape.toLowerCase());
  if (status) stones = stones.filter((s) => s.status.toLowerCase() === status.toLowerCase());
  if (featured !== null) stones = stones.filter((s) => !!s.featured === (featured === 'true'));
  if (minCarat) stones = stones.filter((s) => s.carat >= minCarat);
  if (maxCarat) stones = stones.filter((s) => s.carat <= maxCarat);
  if (minPrice) stones = stones.filter((s) => s.priceUSD >= minPrice);
  if (maxPrice) stones = stones.filter((s) => s.priceUSD <= maxPrice);
  if (search) {
    stones = stones.filter((s) =>
      [s.name, s.origin, s.color, s.clarity, s.certNumber, s.description].some((f) => f.toLowerCase().includes(search))
    );
  }

  return ok({ count: stones.length, data: stones });
});

import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../backend/data/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    let stones = await db.getGemstones();

    const category = searchParams.get('category');
    const shape = searchParams.get('shape');
    const minCarat = searchParams.get('minCarat');
    const maxCarat = searchParams.get('maxCarat');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const status = searchParams.get('status');
    const featured = searchParams.get('featured');
    const search = searchParams.get('search');

    if (category && category !== 'All') {
      stones = stones.filter((s) => s.category.toLowerCase() === category.toLowerCase());
    }

    if (shape) {
      stones = stones.filter((s) => s.shape.toLowerCase() === shape.toLowerCase());
    }

    if (minCarat) {
      stones = stones.filter((s) => s.carat >= parseFloat(minCarat));
    }

    if (maxCarat) {
      stones = stones.filter((s) => s.carat <= parseFloat(maxCarat));
    }

    if (minPrice) {
      stones = stones.filter((s) => s.priceUSD >= parseFloat(minPrice));
    }

    if (maxPrice) {
      stones = stones.filter((s) => s.priceUSD <= parseFloat(maxPrice));
    }

    if (status) {
      stones = stones.filter((s) => s.status.toLowerCase() === status.toLowerCase());
    }

    if (featured !== null) {
      const isFeatured = featured === 'true';
      stones = stones.filter((s) => !!s.featured === isFeatured);
    }

    if (search) {
      const q = search.toLowerCase();
      stones = stones.filter((s) =>
        s.name.toLowerCase().includes(q) ||
        s.origin.toLowerCase().includes(q) ||
        s.color.toLowerCase().includes(q) ||
        s.clarity.toLowerCase().includes(q) ||
        s.certNumber.toLowerCase().includes(q) ||
        s.description.toLowerCase().includes(q)
      );
    }

    return NextResponse.json({
      success: true,
      count: stones.length,
      data: stones
    });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve gemstones.' },
      { status: 500 }
    );
  }
}

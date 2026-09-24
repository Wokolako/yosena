import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../backend/data/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slug = searchParams.get('slug');

    // Both queries order policies and their sections in SQL.
    if (slug) {
      const policy = await db.getPolicyBySlug(slug);
      if (!policy) {
        return NextResponse.json(
          { success: false, error: `Policy '${slug}' not found.` },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: policy });
    }

    const policies = await db.getPolicies();
    return NextResponse.json({ success: true, count: policies.length, data: policies });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve policy documents.' },
      { status: 500 }
    );
  }
}

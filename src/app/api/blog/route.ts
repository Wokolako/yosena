import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../backend/data/db';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');

    // Drafts are desk material. Asking for them is not the same as being
    // allowed to see them, so the flag only counts once the role check passes.
    // The short-circuit keeps the Clerk and database lookup off the public
    // path entirely: an anonymous read of the journal costs what it always did.
    const wantsDrafts = searchParams.get('includeDrafts') === 'true';
    const maySeeDrafts = wantsDrafts && !(await requireAdmin()).response;

    let posts = (await db.getBlogPosts()).filter((p) => maySeeDrafts || p.isPublished);

    if (category && category !== 'All') {
      posts = posts.filter((p) => p.category.toLowerCase() === category.toLowerCase());
    }

    return NextResponse.json({ success: true, count: posts.length, data: posts });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve journal articles.' },
      { status: 500 }
    );
  }
}

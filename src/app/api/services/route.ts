import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../backend/data/db';
import { requireAdmin } from '../../../lib/requireAdmin';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    // A service the desk deactivated is not on offer; only the desk may list
    // them. Checked the same way as blog drafts, and just as lazily.
    const wantsInactive = searchParams.get('includeInactive') === 'true';
    const maySeeInactive = wantsInactive && !(await requireAdmin()).response;

    const services = (await db.getServices()).filter((s) => maySeeInactive || s.isActive);

    return NextResponse.json({ success: true, count: services.length, data: services });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to retrieve consultation services.' },
      { status: 500 }
    );
  }
}

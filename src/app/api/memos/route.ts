import { NextRequest, NextResponse } from 'next/server';
import { db, MemoData } from '../../../../backend/data/db';
import { getTradeUser } from '../../../lib/requireUser';

export async function GET(req: NextRequest) {
  try {
    const user = await getTradeUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    if (user.accountRole !== 'admin') {
      const userMemos = await db.getMemosForUser(user.id, user.memberId);
      return NextResponse.json({ success: true, count: userMemos.length, data: userMemos });
    }

    const memos = await db.getMemos();
    return NextResponse.json({ success: true, count: memos.length, data: memos });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve memos.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getTradeUser();

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required.' },
        { status: 401 }
      );
    }

    // Creating a memo takes a stone off the public floor and ships it on
    // consignment against the member's credit line. A Clerk account alone is
    // not standing for that — anyone can make one, and new accounts land as
    // unverified trade partners. The desk verifies the business first.
    if (!user.isVerifiedTrade && user.accountRole !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error:
            'Memo consignment is open to verified trade members. Our desk will confirm your business credentials first.'
        },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { stoneId, notes } = body;

    if (!stoneId) {
      return NextResponse.json(
        { success: false, error: 'Gemstone ID is required.' },
        { status: 400 }
      );
    }

    const stone = await db.getGemstoneById(stoneId);

    if (!stone) {
      return NextResponse.json({ success: false, error: 'Gemstone not found.' }, { status: 404 });
    }

    const memoId = `MEMO-${Math.floor(8000 + Math.random() * 2000)}`;
    const trackingCode = `FER-${Math.floor(1000000 + Math.random() * 9000000)}-UK`;

    const newMemo: MemoData = {
      id: memoId,
      userId: user.id,
      memberId: user.memberId,
      companyName: user.companyName,
      stoneId: stone.id,
      stoneName: stone.name,
      dateDispatched: new Date().toISOString().split('T')[0],
      daysRemaining: 14,
      courier: 'Ferrari Logistics (Armored Courier)',
      tracking: trackingCode,
      declaredValueUSD: stone.priceUSD,
      status: 'Consignment Approved - Dispatching',
      notes: notes || 'Inspection memo requested for client presentation.',
      createdAt: new Date().toISOString()
    };

    // Records the memo and flips the stone to 'On Memo' in one transaction.
    const saved = await db.createMemo(newMemo);

    return NextResponse.json(
      {
        success: true,
        message: 'Memo consignment request confirmed. Armored logistics dispatched.',
        data: saved
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Failed to process memo request.' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { db, OrderData } from '../../../../backend/data/db';
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
      const userOrders = await db.getOrdersForUser(user.id, user.email);
      return NextResponse.json({ success: true, count: userOrders.length, data: userOrders });
    }

    const orders = await db.getOrders();
    return NextResponse.json({ success: true, count: orders.length, data: orders });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Failed to retrieve orders.' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Checkout is open to guests, so an order may have no account behind it.
    const user = await getTradeUser();

    const body = await req.json();
    const { items, clientName, companyName, email, paymentMethod, shippingService } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: 'Cart items array cannot be empty.' }, { status: 400 });
    }

    if (!clientName || !email) {
      return NextResponse.json({ success: false, error: 'Client name and email are required.' }, { status: 400 });
    }

    const totalUSD = items.reduce(
      (sum: number, item: any) => sum + (Number(item.priceUSD || 0) * Number(item.quantity || 1)),
      0
    );

    const orderId = `ORD-2026-${Math.floor(100 + Math.random() * 900)}`;
    const newOrder: OrderData = {
      id: orderId,
      userId: user?.id,
      memberId: user?.memberId,
      clientName: String(clientName).trim(),
      companyName: (companyName || 'Independent Fine Jeweller').trim(),
      email: String(email).trim().toLowerCase(),
      items: items.map((it: any) => ({
        gemstoneId: it.gemstoneId || it.id,
        name: it.name,
        carat: Number(it.carat),
        priceUSD: Number(it.priceUSD),
        quantity: Number(it.quantity || 1)
      })),
      totalUSD,
      paymentMethod: paymentMethod || 'Wire Transfer (Escrow)',
      shippingService: shippingService || 'Ferrari Armored High-Value Courier',
      status: 'Settlement Escrow Awaiting Verification',
      createdAt: new Date().toISOString()
    };

    const saved = await db.createOrder(newOrder);

    return NextResponse.json(
      {
        success: true,
        message: 'High-value acquisition order registered.',
        data: saved
      },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json({ success: false, error: 'Failed to create order.' }, { status: 500 });
  }
}

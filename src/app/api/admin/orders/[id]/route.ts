import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { markOrderPaid, cancelOrder, refundOrder, extendOrderHold, releaseExpiredHolds } from '@backend/lib/commerce';
import { expireCheckoutSession } from '@backend/payments/stripe';
import { adminOrderView } from '@backend/lib/adminInput';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';
import * as v from '@backend/lib/validate';

type Ctx = { params: Promise<{ id: string }> };

const ACTIONS = ['mark_paid', 'mark_shipped', 'mark_completed', 'cancel', 'refund', 'extend_hold', 'note'] as const;

export const PATCH = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { id } = await params;
  const body = await readJson(req);
  const action = v.oneOf(body.action, 'Action', ACTIONS);
  const note = v.str(body.note, 'Note', { max: 1000 });

  const { order, warning, sessionToExpire } = db.transaction((tx) => {
    releaseExpiredHolds(tx);
    const orders = tx.get('orders');
    const order = orders.find((o) => o.id === id);
    if (!order) throw new HttpError(404, 'Order not found.');
    if (!order.history) order.history = [];
    let warning: string | null = null;
    let sessionToExpire: string | null = null;
    const now = new Date().toISOString();

    switch (action) {
      case 'mark_paid':
        if (order.paymentMethod === 'card' && order.status === 'pending_payment') {
          throw new HttpError(409, 'Online payments are confirmed automatically by the payment provider.');
        }
        warning = markOrderPaid(tx, order, admin.email);
        break;
      case 'mark_shipped': {
        if (order.status !== 'paid') throw new HttpError(409, 'Only paid orders can be shipped.');
        order.courier = v.str(body.courier, 'Courier', { required: true, max: 120 });
        order.tracking = v.str(body.tracking, 'Tracking number', { required: true, max: 120 });
        order.status = 'shipped';
        order.history.push({ at: now, status: 'shipped', by: admin.email, note: `${order.courier} ${order.tracking}` });
        break;
      }
      case 'mark_completed':
        if (order.status !== 'shipped') throw new HttpError(409, 'Only shipped orders can be completed.');
        order.status = 'completed';
        order.history.push({ at: now, status: 'completed', by: admin.email });
        break;
      case 'cancel':
        cancelOrder(tx, order, admin.email, note || 'Cancelled by the trade desk.');
        sessionToExpire = order.payment?.sessionId ?? null;
        break;
      case 'refund':
        refundOrder(tx, order, admin.email, note || 'Refund recorded by the trade desk.');
        break;
      case 'extend_hold':
        extendOrderHold(tx, order, v.num(body.hours ?? 72, 'Hours', { min: 1, max: 24 * 30 }), admin.email);
        break;
      case 'note':
        order.adminNotes = v.str(body.adminNotes, 'Notes', { max: 4000 });
        break;
    }
    if (action === 'mark_paid' || action === 'refund') order.attention = warning;
    order.updatedAt = now;
    tx.set('orders', orders);
    audit(tx, admin, `order.${action}`, order.reference ?? order.id, note ? { note } : undefined);
    return { order, warning, sessionToExpire };
  });

  if (sessionToExpire) await expireCheckoutSession(sessionToExpire);
  return ok({ message: warning ?? 'Order updated.', data: adminOrderView(order) });
});

import { db, Tx, StoneRecord, OrderRecord, MemoRecord, UserRecord } from '../store/db';
import {
  SHIPPING_OPTIONS,
  TAX_RATE,
  promoCodes,
  HOLD,
  CARD_LIMIT_USD,
  CARD_REQUIRES_APPROVED_ACCOUNT,
  stripeEnabled,
  MEMO_DAYS,
} from '../config';
import { HttpError } from './http';
import { newId, newReference, newSecret } from './ids';
import { isApprovedTrade } from '../auth/session';
import {
  ORDER_STATUS_LABELS,
  type CheckoutTotals,
  type CustomerMemo,
  type CustomerOrder,
  type Gemstone,
  type PaymentMethod,
} from '../../src/types';

const nowIso = () => new Date().toISOString();
const usd = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

/** Order states in which the stones are still only held, not yet paid for. */
export const UNPAID_STATUSES = ['pending_payment', 'processing_payment', 'awaiting_wire'];
/** Memo states that count against a member's memo credit line. */
const OPEN_MEMO_STATUSES = ['Requested', 'On Memo'];

// ---------------------------------------------------------------- stones

export function toPublicStone(s: StoneRecord): Gemstone {
  return {
    id: s.id,
    name: s.name,
    category: s.category,
    shape: s.shape,
    carat: s.carat,
    color: s.color,
    clarity: s.clarity,
    origin: s.origin,
    treatment: s.treatment,
    certification: s.certification,
    certNumber: s.certNumber,
    priceUSD: s.priceUSD,
    pricePerCarat: s.pricePerCarat,
    dimensions: s.dimensions,
    image: s.image,
    featured: !!s.featured,
    status: s.status,
    description: s.description,
  };
}

function history(record: { history?: any[] }, status: string, by: string, note?: string) {
  record.history = record.history || [];
  record.history.push({ at: nowIso(), status, by, ...(note ? { note } : {}) });
}

/**
 * Returns stones whose hold has lapsed to the vault and marks the unpaid order or
 * memo request that held them as expired. Runs lazily inside every transaction that
 * reads stock, so no background job is needed.
 */
export function releaseExpiredHolds(tx: Tx): void {
  const now = Date.now();
  const stones = tx.get('gemstones');
  const lapsedHolders = new Set<string>();

  for (const stone of stones) {
    if (stone.status === 'Reserved' && stone.reservedUntil && Date.parse(stone.reservedUntil) <= now) {
      if (stone.reservedFor) lapsedHolders.add(stone.reservedFor);
      stone.status = 'In Vault';
      stone.reservedFor = null;
      stone.reservedUntil = null;
      stone.updatedAt = nowIso();
    }
  }
  if (lapsedHolders.size === 0) return;
  tx.set('gemstones', stones);

  const orders = tx.get('orders');
  let ordersChanged = false;
  for (const order of orders) {
    if (lapsedHolders.has(order.id) && UNPAID_STATUSES.includes(order.status)) {
      order.status = 'expired';
      order.reservedUntil = null;
      order.updatedAt = nowIso();
      history(order, 'expired', 'system', 'Hold lapsed before payment was confirmed.');
      ordersChanged = true;
    }
  }
  if (ordersChanged) tx.set('orders', orders);

  const memos = tx.get('memos');
  let memosChanged = false;
  for (const memo of memos) {
    if (lapsedHolders.has(memo.id) && memo.status === 'Requested') {
      memo.status = 'Expired';
      memo.updatedAt = nowIso();
      history(memo, 'Expired', 'system', 'Request was not approved before the hold lapsed.');
      memosChanged = true;
    }
  }
  if (memosChanged) tx.set('memos', memos);
}

export function publicStones(): Gemstone[] {
  return db.transaction((tx) => {
    releaseExpiredHolds(tx);
    return tx.get('gemstones').filter((s) => !s.archived).map(toPublicStone);
  });
}

function reserve(stones: StoneRecord[], stoneId: string, holderId: string, until: string | null) {
  const stone = stones.find((s) => s.id === stoneId);
  if (!stone || stone.status !== 'In Vault') throw new HttpError(409, 'A stone in your cart was just reserved by someone else.');
  stone.status = 'Reserved';
  stone.reservedFor = holderId;
  stone.reservedUntil = until;
  stone.updatedAt = nowIso();
}

/** Puts back every stone still held (not sold) for this order or memo. */
function releaseHeld(tx: Tx, holderId: string) {
  const stones = tx.get('gemstones');
  for (const s of stones) {
    if (s.reservedFor === holderId && (s.status === 'Reserved' || s.status === 'On Memo')) {
      s.status = 'In Vault';
      s.reservedFor = null;
      s.reservedUntil = null;
      s.updatedAt = nowIso();
    }
  }
  tx.set('gemstones', stones);
}

function extendHeld(tx: Tx, holderId: string, until: string) {
  const stones = tx.get('gemstones');
  for (const s of stones) {
    if (s.reservedFor === holderId && s.status === 'Reserved') s.reservedUntil = until;
  }
  tx.set('gemstones', stones);
}

// ---------------------------------------------------------------- pricing

export function priceCart(
  stones: StoneRecord[],
  stoneIds: string[],
  shippingMethod: string,
  promoCode: string | null
): CheckoutTotals {
  const items: CheckoutTotals['items'] = [];
  const unavailable: CheckoutTotals['unavailable'] = [];

  for (const id of Array.from(new Set(stoneIds))) {
    const stone = stones.find((s) => s.id === id && !s.archived);
    if (!stone) unavailable.push({ stoneId: id, name: 'This stone', status: 'No longer listed' });
    else if (stone.status !== 'In Vault') unavailable.push({ stoneId: id, name: stone.name, status: stone.status });
    else items.push({ stoneId: stone.id, name: stone.name, carat: stone.carat, priceUSD: stone.priceUSD });
  }

  const shipping = SHIPPING_OPTIONS.find((o) => o.id === shippingMethod);
  if (!shipping) throw new HttpError(400, 'Choose a delivery option.');

  let promoApplied: string | null = null;
  let promoError: string | null = null;
  let percent = 0;
  if (promoCode) {
    const code = promoCode.trim().toUpperCase();
    const codes = promoCodes();
    if (codes[code]) {
      percent = codes[code];
      promoApplied = code;
    } else {
      promoError = 'This code is not valid.';
    }
  }

  const subtotalUSD = items.reduce((sum, i) => sum + i.priceUSD, 0);
  const discountUSD = Math.round((subtotalUSD * percent) / 100);
  const shippingUSD = items.length ? shipping.priceUSD : 0;
  const taxUSD = Math.round((subtotalUSD - discountUSD) * TAX_RATE());
  const totalUSD = subtotalUSD - discountUSD + shippingUSD + taxUSD;

  return { items, unavailable, subtotalUSD, discountUSD, shippingUSD, taxUSD, totalUSD, promoApplied, promoError };
}

export function quoteCart(stoneIds: string[], shippingMethod: string, promoCode: string | null): CheckoutTotals {
  return db.transaction((tx) => {
    releaseExpiredHolds(tx);
    return priceCart(tx.get('gemstones'), stoneIds, shippingMethod, promoCode);
  });
}

// ---------------------------------------------------------------- checkout

export interface CheckoutInput {
  stoneIds: string[];
  shippingMethod: string;
  promoCode: string | null;
  paymentMethod: PaymentMethod;
  notes: string;
  contact: OrderRecord['contact'];
}

export type CheckoutResult = { kind: 'order'; order: OrderRecord } | { kind: 'memo'; memos: MemoRecord[] };

export function openMemoExposure(tx: Tx, userId: string): number {
  return tx
    .get('memos')
    .filter((m) => m.userId === userId && OPEN_MEMO_STATUSES.includes(m.status))
    .reduce((sum, m) => sum + (Number(m.declaredValueUSD) || 0), 0);
}

export function placeCheckout(input: CheckoutInput, user: UserRecord | null): CheckoutResult {
  return db.transaction((tx) => {
    releaseExpiredHolds(tx);
    const stones = tx.get('gemstones');
    const totals = priceCart(stones, input.stoneIds, input.shippingMethod, input.promoCode);

    if (totals.unavailable.length) {
      throw new HttpError(409, 'Some stones in your cart are no longer available.', { unavailable: totals.unavailable });
    }
    if (!totals.items.length) throw new HttpError(400, 'Your cart is empty.');
    if (input.promoCode && totals.promoError) throw new HttpError(400, totals.promoError);

    const now = Date.now();
    const by = user?.email ?? `guest:${input.contact.email}`;

    if (input.paymentMethod === 'memo') {
      if (!isApprovedTrade(user)) {
        throw new HttpError(403, 'Inspection memos are available to approved trade accounts. Sign in with an approved account, or choose another option.');
      }
      const available = user.creditLineUSD - openMemoExposure(tx, user.id);
      if (totals.subtotalUSD > available) {
        throw new HttpError(403, `This request exceeds your available memo credit (${usd(Math.max(0, available))}). Contact the trade desk to raise it.`);
      }
      const until = new Date(now + HOLD.memoHours() * 3600_000).toISOString();
      const memos: MemoRecord[] = totals.items.map((item) => ({
        id: newReference('MEMO'),
        userId: user.id,
        memberId: user.memberId,
        companyName: user.companyName,
        stoneId: item.stoneId,
        stoneName: item.name,
        declaredValueUSD: item.priceUSD,
        status: 'Requested',
        courier: '',
        tracking: '',
        dateDispatched: null,
        dueDate: null,
        notes: input.notes,
        history: [{ at: nowIso(), status: 'Requested', by }],
        createdAt: nowIso(),
        updatedAt: nowIso(),
      }));
      for (const memo of memos) reserve(stones, memo.stoneId, memo.id, until);
      tx.set('gemstones', stones);
      tx.set('memos', [...memos, ...tx.get('memos')]);
      return { kind: 'memo', memos };
    }

    if (input.paymentMethod === 'card') {
      if (!stripeEnabled()) throw new HttpError(400, 'Online payment is not available yet. Please choose bank wire.');
      if (totals.totalUSD > CARD_LIMIT_USD()) {
        throw new HttpError(400, `Online payment is available for orders up to ${usd(CARD_LIMIT_USD())}. Please choose bank wire.`);
      }
      if (CARD_REQUIRES_APPROVED_ACCOUNT() && !isApprovedTrade(user)) {
        throw new HttpError(403, 'Online payment is available to approved trade accounts. Choose bank wire, or sign in with an approved account.');
      }
    }

    const holdMs = input.paymentMethod === 'card' ? HOLD.cardMinutes() * 60_000 : HOLD.wireHours() * 3600_000;
    const reservedUntil = new Date(now + holdMs).toISOString();
    const status = input.paymentMethod === 'card' ? 'pending_payment' : 'awaiting_wire';
    const shipping = SHIPPING_OPTIONS.find((o) => o.id === input.shippingMethod)!;

    const order: OrderRecord = {
      id: newId('ord'),
      reference: newReference('ORD'),
      userId: user?.id ?? null,
      memberId: user?.memberId ?? null,
      contact: input.contact,
      items: totals.items,
      subtotalUSD: totals.subtotalUSD,
      discountUSD: totals.discountUSD,
      shippingUSD: totals.shippingUSD,
      taxUSD: totals.taxUSD,
      totalUSD: totals.totalUSD,
      promoCode: totals.promoApplied,
      shippingMethod: shipping.id,
      shippingLabel: shipping.label,
      paymentMethod: input.paymentMethod,
      status,
      reservedUntil,
      accessToken: newSecret(),
      payment: null,
      adminNotes: input.notes ? `Customer note: ${input.notes}` : '',
      history: [{ at: nowIso(), status, by }],
      createdAt: nowIso(),
      updatedAt: nowIso(),
    };

    for (const item of order.items) reserve(stones, item.stoneId, order.id, reservedUntil);
    tx.set('gemstones', stones);
    tx.set('orders', [order, ...tx.get('orders')]);
    return { kind: 'order', order };
  });
}

// ---------------------------------------------------------------- order transitions (call inside a transaction)

/** Marks an order paid and its stones sold. Returns a warning if a stone could not be allocated. */
export function markOrderPaid(tx: Tx, order: OrderRecord, by: string): string | null {
  if (['paid', 'shipped', 'completed'].includes(order.status)) return null; // already settled
  const stones = tx.get('gemstones');
  const conflicts: string[] = [];
  for (const item of order.items) {
    const stoneId = item.stoneId ?? (item as any).gemstoneId; // older records used gemstoneId
    const stone = stones.find((s) => s.id === stoneId);
    const heldForThis = stone && stone.reservedFor === order.id && (stone.status === 'Reserved' || stone.status === 'Sold');
    if (stone && (heldForThis || stone.status === 'In Vault')) {
      stone.status = 'Sold';
      stone.reservedFor = order.id;
      stone.reservedUntil = null;
      stone.updatedAt = nowIso();
    } else {
      conflicts.push(`${item.name} (${stone ? stone.status : 'removed'})`);
    }
  }
  tx.set('gemstones', stones);

  const lapsed = order.status === 'expired' || order.status === 'cancelled';
  order.status = 'paid';
  order.reservedUntil = null;
  order.updatedAt = nowIso();
  order.attention = conflicts.length
    ? `Payment received${lapsed ? ' after the hold lapsed' : ''}, but these stones could not be allocated: ${conflicts.join(', ')}. Arrange a replacement or refund.`
    : null;
  history(order, 'paid', by);
  return order.attention;
}

export function cancelOrder(tx: Tx, order: OrderRecord, by: string, note?: string, status: 'cancelled' | 'expired' = 'cancelled') {
  if (!UNPAID_STATUSES.includes(order.status) && order.status !== 'expired') {
    throw new HttpError(409, `An order that is ${ORDER_STATUS_LABELS[order.status] ?? order.status} cannot be cancelled.`);
  }
  releaseHeld(tx, order.id);
  order.status = status;
  order.reservedUntil = null;
  order.updatedAt = nowIso();
  history(order, status, by, note);
}

export function extendOrderHold(tx: Tx, order: OrderRecord, hours: number, by: string) {
  if (!UNPAID_STATUSES.includes(order.status)) throw new HttpError(409, 'Only unpaid orders have a hold to extend.');
  const base = Math.max(Date.now(), order.reservedUntil ? Date.parse(order.reservedUntil) : 0);
  const until = new Date(base + hours * 3600_000).toISOString();
  order.reservedUntil = until;
  order.updatedAt = nowIso();
  extendHeld(tx, order.id, until);
  history(order, order.status, by, `Hold extended to ${until}`);
}

export function markOrderProcessing(tx: Tx, order: OrderRecord, by: string) {
  if (order.status !== 'pending_payment') return;
  order.status = 'processing_payment';
  const until = new Date(Date.now() + HOLD.wireHours() * 3600_000).toISOString();
  order.reservedUntil = until;
  order.updatedAt = nowIso();
  extendHeld(tx, order.id, until);
  history(order, 'processing_payment', by, 'Bank payment started; awaiting funds.');
}

export function refundOrder(tx: Tx, order: OrderRecord, by: string, note?: string) {
  if (!['paid', 'shipped', 'completed'].includes(order.status)) throw new HttpError(409, 'Only paid orders can be marked refunded.');
  const stones = tx.get('gemstones');
  for (const s of stones) {
    if (s.reservedFor === order.id && s.status === 'Sold') {
      s.status = 'In Vault';
      s.reservedFor = null;
      s.updatedAt = nowIso();
    }
  }
  tx.set('gemstones', stones);
  order.status = 'refunded';
  order.updatedAt = nowIso();
  history(order, 'refunded', by, note);
}

// ---------------------------------------------------------------- memo transitions (call inside a transaction)

export function approveMemo(tx: Tx, memo: MemoRecord, courier: string, tracking: string, by: string) {
  if (memo.status !== 'Requested') throw new HttpError(409, 'Only requested memos can be approved.');
  const stones = tx.get('gemstones');
  const stone = stones.find((s) => s.id === memo.stoneId);
  if (!stone || !(stone.status === 'In Vault' || (stone.status === 'Reserved' && stone.reservedFor === memo.id))) {
    throw new HttpError(409, 'The stone is no longer available for this memo.');
  }
  stone.status = 'On Memo';
  stone.reservedFor = memo.id;
  stone.reservedUntil = null;
  stone.updatedAt = nowIso();
  tx.set('gemstones', stones);

  const today = new Date();
  memo.status = 'On Memo';
  memo.courier = courier;
  memo.tracking = tracking;
  memo.dateDispatched = today.toISOString().slice(0, 10);
  memo.dueDate = new Date(today.getTime() + MEMO_DAYS * 86_400_000).toISOString().slice(0, 10);
  memo.updatedAt = nowIso();
  history(memo, 'On Memo', by);
}

export function closeMemo(tx: Tx, memo: MemoRecord, outcome: 'Rejected' | 'Returned' | 'Sold', by: string, note?: string) {
  if (['Rejected', 'Returned', 'Sold', 'Expired'].includes(memo.status)) throw new HttpError(409, `This memo is already ${memo.status.toLowerCase()}.`);
  if (outcome === 'Rejected' && memo.status !== 'Requested') throw new HttpError(409, 'Only requested memos can be rejected.');
  const stones = tx.get('gemstones');
  const stone = stones.find((s) => s.id === memo.stoneId);
  if (stone) {
    const heldHere = stone.reservedFor === memo.id || (!stone.reservedFor && stone.status === 'On Memo');
    if (outcome === 'Sold' && (heldHere || stone.status === 'In Vault')) {
      stone.status = 'Sold';
      stone.reservedFor = memo.id;
      stone.reservedUntil = null;
      stone.updatedAt = nowIso();
    } else if (outcome !== 'Sold' && heldHere) {
      stone.status = 'In Vault';
      stone.reservedFor = null;
      stone.reservedUntil = null;
      stone.updatedAt = nowIso();
    }
    tx.set('gemstones', stones);
  }
  memo.status = outcome;
  memo.updatedAt = nowIso();
  history(memo, outcome, by, note);
}

// ---------------------------------------------------------------- customer-facing views

export function toCustomerOrder(o: OrderRecord): CustomerOrder {
  const items = (o.items || []).map((i: any) => ({
    stoneId: i.stoneId ?? i.gemstoneId,
    name: i.name,
    carat: Number(i.carat) || 0,
    priceUSD: Number(i.priceUSD) || 0,
  }));
  const subtotal = o.subtotalUSD ?? items.reduce((s, i) => s + i.priceUSD, 0);
  return {
    reference: o.reference ?? o.id,
    status: o.status,
    statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
    paymentMethod: o.paymentMethod,
    items,
    subtotalUSD: subtotal,
    discountUSD: o.discountUSD ?? 0,
    shippingUSD: o.shippingUSD ?? 0,
    taxUSD: o.taxUSD ?? 0,
    totalUSD: o.totalUSD ?? subtotal,
    shippingLabel: o.shippingLabel ?? o.shippingService ?? '',
    tracking: o.tracking ?? null,
    courier: o.courier ?? null,
    reservedUntil: UNPAID_STATUSES.includes(o.status) ? o.reservedUntil ?? null : null,
    createdAt: o.createdAt,
  };
}

export function toCustomerMemo(m: MemoRecord): CustomerMemo {
  let daysRemaining: number | null = null;
  if (m.status === 'On Memo' && m.dueDate) {
    daysRemaining = Math.max(0, Math.ceil((Date.parse(m.dueDate) - Date.now()) / 86_400_000));
  } else if (typeof m.daysRemaining === 'number' && !m.dueDate) {
    daysRemaining = m.daysRemaining; // records created before due dates were stored
  }
  return {
    id: m.id,
    stoneId: m.stoneId,
    stoneName: m.stoneName,
    declaredValueUSD: m.declaredValueUSD,
    status: m.status,
    courier: m.courier || '',
    tracking: m.tracking || '',
    dateDispatched: m.dateDispatched || null,
    dueDate: m.dueDate ?? null,
    daysRemaining,
    notes: m.notes,
    createdAt: m.createdAt,
  };
}

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Gemstone,
  PageView,
  CheckoutTotals,
  CustomerOrder,
  CustomerMemo,
  PaymentMethod,
} from '../types';
import { useSiteData } from '../context/SiteDataContext';
import { useAuth } from '../context/AuthContext';
import { CONTACT_EMAIL } from '../lib/contact';
import {
  X,
  Trash2,
  ShoppingBag,
  ArrowRight,
  CheckCircle2,
  Lock,
  Loader2,
  AlertCircle,
  Clock,
  Copy,
} from 'lucide-react';

/** A return from the payment page, or a visit to a private order link. */
export interface CheckoutReturn {
  reference: string;
  token: string;
  outcome: 'success' | 'cancelled' | 'view';
}

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartIds: string[];
  onRemoveItem: (gemstoneId: string) => void;
  onClearCart: () => void;
  onSelectStone: (stone: Gemstone) => void;
  onNavigate: (page: PageView) => void;
  checkoutReturn: CheckoutReturn | null;
}

type Confirmation =
  | { kind: 'order'; order: CustomerOrder; orderLink?: string; wireInstructions?: string | null; note?: string }
  | { kind: 'memo'; memos: CustomerMemo[] }
  | { kind: 'error'; message: string };

const usd = (n: number) => `$${Math.round(n).toLocaleString('en-US')}`;
const inputClass =
  'w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded p-2.5 text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none focus:border-[#1A1918] dark:focus:border-[#C5A880] font-medium';
const labelClass = 'block text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold';

async function api(url: string, body?: unknown) {
  const res = await fetch(url, body === undefined
    ? { cache: 'no-store' }
    : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartIds,
  onRemoveItem,
  onClearCart,
  onSelectStone,
  onNavigate,
  checkoutReturn,
}) => {
  const { stones, checkout, refreshStones } = useSiteData();
  const { user, isApprovedTrade } = useAuth();

  const [step, setStep] = useState<'cart' | 'checkout' | 'confirmation'>('cart');
  const [shippingMethod, setShippingMethod] = useState<string>(checkout.shippingOptions[0]?.id ?? 'armored');
  const [promoInput, setPromoInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string | null>(null);
  const [promoFeedback, setPromoFeedback] = useState<{ ok: boolean; text: string } | null>(null);
  const [totals, setTotals] = useState<CheckoutTotals | null>(null);
  const [totalsLoading, setTotalsLoading] = useState(false);
  const [totalsError, setTotalsError] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('wire');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    clientName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'United Kingdom',
  });
  const pollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Leaving a confirmation returns the drawer to the cart for next time.
  const close = useCallback(() => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    if (step === 'confirmation') {
      setStep('cart');
      setConfirmation(null);
    }
    onClose();
  }, [step, onClose]);

  // Close on Escape and lock background scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, close]);

  // Totals always come from the server, which is also what checkout will charge.
  const cartKey = cartIds.join(',');
  useEffect(() => {
    if (!isOpen || step === 'confirmation') return;
    if (cartIds.length === 0) {
      setTotals(null);
      return;
    }
    let cancelled = false;
    setTotalsLoading(true);
    setTotalsError(null);
    const timer = setTimeout(async () => {
      try {
        const { res, data } = await api('/api/checkout/quote', { stoneIds: cartIds, shippingMethod, promoCode: appliedPromo });
        if (cancelled) return;
        if (!res.ok || !data?.success) setTotalsError(data?.error ?? 'Could not price your cart.');
        else setTotals(data.totals);
      } catch {
        if (!cancelled) setTotalsError('Could not reach the trade desk. Check your connection.');
      } finally {
        if (!cancelled) setTotalsLoading(false);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, cartKey, shippingMethod, appliedPromo, step]);

  // Prefill contact details for signed-in members.
  useEffect(() => {
    if (step !== 'checkout' || !user) return;
    setForm((f) => ({
      ...f,
      companyName: f.companyName || user.companyName,
      clientName: f.clientName || user.clientName,
      email: f.email || user.email,
      phone: f.phone || user.phone,
      address: f.address || user.address,
    }));
  }, [step, user]);

  const lookupOrder = useCallback(
    async (ret: CheckoutReturn, attempt = 0) => {
      const { res, data } = await api(`/api/orders/lookup?ref=${encodeURIComponent(ret.reference)}&t=${encodeURIComponent(ret.token)}`);
      if (!res.ok || !data?.success) {
        setConfirmation({ kind: 'error', message: data?.error ?? 'We could not find that order.' });
        return;
      }
      const order: CustomerOrder = data.order;
      setConfirmation({ kind: 'order', order, orderLink: `/?order=${encodeURIComponent(ret.reference)}&t=${encodeURIComponent(ret.token)}` });
      if (['paid', 'processing_payment'].includes(order.status)) {
        onClearCart();
        void refreshStones();
      }
      // The payment provider confirms by webhook, usually within seconds of the redirect.
      if (ret.outcome === 'success' && order.status === 'pending_payment' && attempt < 10) {
        pollTimer.current = setTimeout(() => void lookupOrder(ret, attempt + 1), 3000);
      }
    },
    [onClearCart, refreshStones]
  );

  // Arriving back from the payment page, or from an order link.
  useEffect(() => {
    if (!checkoutReturn) return;
    setStep('confirmation');
    setConfirmation(null);
    (async () => {
      try {
        if (checkoutReturn.outcome === 'cancelled') {
          await api('/api/checkout/cancel', { reference: checkoutReturn.reference, t: checkoutReturn.token });
          void refreshStones();
        }
        await lookupOrder(checkoutReturn);
      } catch {
        setConfirmation({ kind: 'error', message: 'Could not reach the trade desk. Check your connection.' });
      }
    })();
    return () => {
      if (pollTimer.current) clearTimeout(pollTimer.current);
    };
  }, [checkoutReturn, lookupOrder, refreshStones]);

  if (!isOpen) return null;

  const unavailableIds = new Set((totals?.unavailable ?? []).map((u) => u.stoneId));
  const hasUnavailable = unavailableIds.size > 0;
  const cardAllowed =
    checkout.cardEnabled &&
    !!totals &&
    totals.totalUSD <= checkout.cardLimitUSD &&
    (!checkout.cardRequiresApprovedAccount || isApprovedTrade);
  const memoAllowed = isApprovedTrade && !!totals && !!user && totals.subtotalUSD <= user.creditLineUSD;

  const cardReason = !checkout.cardEnabled
    ? 'Not yet available'
    : totals && totals.totalUSD > checkout.cardLimitUSD
      ? `For orders up to ${usd(checkout.cardLimitUSD)}`
      : 'For approved trade accounts';
  const memoReason = !isApprovedTrade
    ? 'For approved trade accounts'
    : 'Exceeds your memo credit line';

  const applyPromo = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = promoInput.trim();
    if (!code) return;
    const { res, data } = await api('/api/checkout/quote', { stoneIds: cartIds, shippingMethod, promoCode: code });
    if (res.ok && data?.success && data.totals.promoApplied) {
      setAppliedPromo(data.totals.promoApplied);
      setPromoFeedback({ ok: true, text: `Code ${data.totals.promoApplied} applied.` });
    } else {
      setAppliedPromo(null);
      setPromoFeedback({ ok: false, text: data?.totals?.promoError ?? data?.error ?? 'This code is not valid.' });
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (paymentMethod === 'card' && !cardAllowed) return setSubmitError('Online payment is not available for this order.');
    if (paymentMethod === 'memo' && !memoAllowed) return setSubmitError('An inspection memo is not available for this order.');
    setSubmitting(true);
    setSubmitError(null);
    try {
      const { res, data } = await api('/api/checkout', {
        stoneIds: cartIds,
        shippingMethod,
        promoCode: appliedPromo,
        paymentMethod,
        notes,
        contact: form,
      });
      if (!res.ok || !data?.success) {
        setSubmitError(data?.error ?? 'The order could not be placed. Please try again.');
        if (res.status === 409) {
          void refreshStones();
          setStep('cart');
        }
        return;
      }
      if (data.kind === 'redirect' && data.url) {
        window.location.href = data.url; // the payment provider's hosted page
        return;
      }
      setConfirmation(
        data.kind === 'memo'
          ? { kind: 'memo', memos: data.memos }
          : { kind: 'order', order: data.order, orderLink: data.orderLink, wireInstructions: data.wireInstructions }
      );
      setStep('confirmation');
      onClearCart();
      void refreshStones();
    } catch {
      setSubmitError('Could not reach the trade desk. Check your connection and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinish = () => {
    if (pollTimer.current) clearTimeout(pollTimer.current);
    setConfirmation(null);
    setStep('cart');
    setNotes('');
    onClose();
  };

  const copyOrderLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}${link}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable; the link stays visible to copy by hand.
    }
  };

  const title =
    step === 'cart' ? `Atelier Vault Cart (${cartIds.length})` : step === 'checkout' ? 'Secure Checkout' : 'Your Order';

  return (
    <div
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-label="Atelier vault cart"
      className="fixed inset-0 z-50 overflow-hidden bg-black/80 backdrop-blur-sm flex justify-end animate-in fade-in"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl bg-[#FAF8F5] dark:bg-[#121110] h-full shadow-2xl flex flex-col justify-between border-l border-[#D5CDC4] dark:border-[#2C2926] relative animate-in slide-in-from-right duration-300 transition-colors"
      >
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#E8E1D9] dark:border-[#262320] bg-[#FFFFFF] dark:bg-[#181614] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-[#1A1918] dark:text-[#F5F2ED]" />
            <h2 className="font-serif text-xl sm:text-2xl text-[#1A1918] dark:text-[#F5F2ED]">{title}</h2>
          </div>
          <button
            onClick={close}
            aria-label="Close"
            className="p-1.5 text-[#78716C] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {submitError && step !== 'confirmation' && (
            <div role="alert" className="flex items-start gap-2.5 px-4 py-3 rounded-lg bg-[#FAF3F0] dark:bg-[#2A1C17] border border-[#E3BCAE] dark:border-[#4A332A]">
              <AlertCircle className="w-4 h-4 text-[#B4553F] dark:text-[#D9846C] shrink-0 mt-0.5" />
              <p className="text-sm text-[#8C4632] dark:text-[#D9846C]">{submitError}</p>
            </div>
          )}

          {/* STEP 1: CART ITEMS */}
          {step === 'cart' && (
            <>
              {cartIds.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-[#F2ECE4] dark:bg-[#23201D] rounded-full flex items-center justify-center mx-auto text-[#8C827A] dark:text-[#A69C94]">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-2xl text-[#1A1918] dark:text-[#F5F2ED]">Your Cart is Empty</h3>
                  <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] max-w-xs mx-auto font-light leading-relaxed">
                    Explore our collection of investment diamonds and rare untreated gemstones to place an order or request an inspection memo.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartIds.map((id) => {
                    const stone = stones.find((s) => s.id === id);
                    const unavailable = totals?.unavailable.find((u) => u.stoneId === id);
                    if (!stone) {
                      return (
                        <div key={id} className="p-4 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E3BCAE] dark:border-[#4A332A] rounded-lg flex items-center justify-between gap-4">
                          <p className="text-sm text-[#8C4632] dark:text-[#D9846C]">This stone is no longer listed.</p>
                          <button onClick={() => onRemoveItem(id)} className="text-xs font-bold uppercase tracking-wider text-[#8C4632] dark:text-[#D9846C] underline cursor-pointer">
                            Remove
                          </button>
                        </div>
                      );
                    }
                    return (
                      <div
                        key={id}
                        className={`p-4 bg-[#FFFFFF] dark:bg-[#181614] border rounded-lg flex items-start gap-4 shadow-sm ${
                          unavailable ? 'border-[#E3BCAE] dark:border-[#4A332A]' : 'border-[#E8E1D9] dark:border-[#262320]'
                        }`}
                      >
                        <img
                          src={stone.image}
                          alt={stone.name}
                          onClick={() => {
                            onSelectStone(stone);
                            onClose();
                          }}
                          className="w-20 h-20 rounded object-cover cursor-pointer hover:opacity-90 transition-opacity shrink-0 bg-[#1A1918]"
                        />
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex justify-between items-start">
                            <h4
                              onClick={() => {
                                onSelectStone(stone);
                                onClose();
                              }}
                              className="font-serif text-base font-semibold text-[#1A1918] dark:text-[#F5F2ED] truncate cursor-pointer hover:text-[#C5A880]"
                            >
                              {stone.name}
                            </h4>
                            <button
                              onClick={() => onRemoveItem(stone.id)}
                              className="text-[#8C827A] dark:text-[#A69C94] hover:text-[#DC2626] dark:hover:text-[#EF4444] transition-colors p-1 cursor-pointer"
                              title="Remove stone"
                              aria-label={`Remove ${stone.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                          <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                            {stone.shape} • {stone.carat} ct • {stone.certification}
                          </p>
                          <div className="flex items-center justify-between pt-1">
                            <span className="font-serif text-base font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                              {usd(stone.priceUSD)} USD
                            </span>
                            <span className="text-xs text-[#8C827A] dark:text-[#A69C94]">Ref: {stone.certNumber}</span>
                          </div>
                          {unavailable && (
                            <p className="text-xs font-bold text-[#8C4632] dark:text-[#D9846C]">
                              No longer available ({unavailable.status}). Remove it to continue.
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* Shipping Options */}
                  <div className="p-4 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg space-y-3">
                    <span className="text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] font-bold block">
                      Select Insured Transit Logistics
                    </span>
                    <div className="space-y-2 text-xs sm:text-sm">
                      {checkout.shippingOptions.map((option) => (
                        <label
                          key={option.id}
                          className={`p-3 rounded border flex items-center justify-between cursor-pointer ${
                            shippingMethod === option.id
                              ? 'border-[#1A1918] dark:border-[#C5A880] bg-[#FAF8F5] dark:bg-[#121110]'
                              : 'border-[#E8E1D9] dark:border-[#262320]'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="radio"
                              name="shipping"
                              checked={shippingMethod === option.id}
                              onChange={() => setShippingMethod(option.id)}
                              className="accent-[#1A1918] dark:accent-[#C5A880]"
                            />
                            <div>
                              <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">{option.label}</span>
                              <span className="text-xs text-[#78716C] dark:text-[#A69C94]">{option.description}</span>
                            </div>
                          </div>
                          <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{usd(option.priceUSD)}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Promo code, validated by the server */}
                  {checkout.promoCodesEnabled && (
                    <>
                      <form onSubmit={applyPromo} className="flex gap-2">
                        <input
                          type="text"
                          placeholder="Trade promo code"
                          value={promoInput}
                          onChange={(e) => setPromoInput(e.target.value)}
                          className="flex-1 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] uppercase tracking-wider focus:outline-none font-medium"
                        />
                        <button
                          type="submit"
                          className="px-4 py-2.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs sm:text-sm uppercase tracking-wider rounded font-bold cursor-pointer hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors"
                        >
                          Apply
                        </button>
                      </form>
                      {promoFeedback && (
                        <p className={`text-xs sm:text-sm font-bold ${promoFeedback.ok ? 'text-[#8C6D44] dark:text-[#C5A880]' : 'text-[#8C4632] dark:text-[#D9846C]'}`}>
                          {promoFeedback.text}
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT FORM */}
          {step === 'checkout' && (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-4 text-xs sm:text-sm">
              <div className="bg-[#FFFFFF] dark:bg-[#181614] p-5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] space-y-3">
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] uppercase tracking-wider block">
                  Atelier &amp; Consignee Details
                </span>
                <div>
                  <label className={labelClass} htmlFor="co-company">Company / Atelier Name *</label>
                  <input id="co-company" type="text" required maxLength={160} value={form.companyName} onChange={(e) => setForm({ ...form, companyName: e.target.value })} placeholder="Sterling Goldsmiths Ltd" className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="co-name">Contact Person *</label>
                    <input id="co-name" type="text" required maxLength={120} value={form.clientName} onChange={(e) => setForm({ ...form, clientName: e.target.value })} placeholder="Arthur Sterling" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="co-email">Business Email *</label>
                    <input id="co-email" type="email" required maxLength={254} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="trade@sterling.com" className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="co-phone">Phone / WhatsApp</label>
                  <input id="co-phone" type="tel" maxLength={40} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="+44 20 7946 0912" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass} htmlFor="co-address">Secure Vault Delivery Address {paymentMethod === 'memo' ? '' : '*'}</label>
                  <input id="co-address" type="text" required={paymentMethod !== 'memo'} maxLength={300} value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Suite 402, 14 Hatton Garden" className={inputClass} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass} htmlFor="co-city">City</label>
                    <input id="co-city" type="text" maxLength={120} value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="London" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="co-country">Country {paymentMethod === 'memo' ? '' : '*'}</label>
                    <input id="co-country" type="text" required={paymentMethod !== 'memo'} maxLength={80} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClass} />
                  </div>
                </div>
                <div>
                  <label className={labelClass} htmlFor="co-notes">Notes for the trade desk</label>
                  <textarea id="co-notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} className={inputClass} />
                </div>
              </div>

              {/* Payment method */}
              <div className="bg-[#FFFFFF] dark:bg-[#181614] p-5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] space-y-3">
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] uppercase tracking-wider block">
                  Settlement &amp; Memo Type
                </span>

                <PaymentOption
                  checked={paymentMethod === 'wire'}
                  onSelect={() => setPaymentMethod('wire')}
                  title="Bank Wire Transfer (SWIFT / CHAPS)"
                  detail="We reserve the stones and email a pro-forma invoice. They are yours once the wire clears."
                  badge="Pro-Forma"
                />
                <PaymentOption
                  checked={paymentMethod === 'card'}
                  disabled={!cardAllowed}
                  onSelect={() => setPaymentMethod('card')}
                  title="Pay Online (card or bank)"
                  detail={cardAllowed ? "You'll pay on our payment provider's secure page." : cardReason}
                  badge="Online"
                />
                <PaymentOption
                  checked={paymentMethod === 'memo'}
                  disabled={!memoAllowed}
                  onSelect={() => setPaymentMethod('memo')}
                  title="14-Day Inspection Memo"
                  detail={memoAllowed ? 'Consignment request for the trade desk to approve. No charge today.' : memoReason}
                  badge="Trade Memo"
                />
                {!user && (
                  <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                    Trade members can pay online or request a memo.{' '}
                    <button type="button" onClick={() => { onClose(); onNavigate('signin'); }} className="underline font-bold text-[#8C6D44] dark:text-[#C5A880] cursor-pointer">
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </form>
          )}

          {/* STEP 3: CONFIRMATION */}
          {step === 'confirmation' && (
            <ConfirmationView
              confirmation={confirmation}
              outcome={checkoutReturn?.outcome}
              signedIn={!!user}
              copied={copied}
              onCopy={copyOrderLink}
              onFinish={handleFinish}
            />
          )}
        </div>

        {/* Drawer Footer */}
        {cartIds.length > 0 && step !== 'confirmation' && (
          <div className="p-5 border-t border-[#E8E1D9] dark:border-[#262320] bg-[#FFFFFF] dark:bg-[#181614] space-y-3.5">
            <div className="space-y-1.5 text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4]">
              {totalsError ? (
                <p className="text-[#8C4632] dark:text-[#D9846C] font-semibold">{totalsError}</p>
              ) : !totals ? (
                <p className="flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Pricing your cart…</p>
              ) : paymentMethod === 'memo' && step === 'checkout' ? (
                <div className="flex justify-between pt-1 font-serif text-xl font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                  <span>Declared Memo Value:</span>
                  <span>{usd(totals.subtotalUSD)} USD</span>
                </div>
              ) : (
                <>
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{usd(totals.subtotalUSD)} USD</span>
                  </div>
                  {totals.discountUSD > 0 && (
                    <div className="flex justify-between text-[#8C6D44] dark:text-[#C5A880] font-semibold">
                      <span>Trade discount ({totals.promoApplied}):</span>
                      <span>-{usd(totals.discountUSD)} USD</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Armored Courier &amp; Insurance:</span>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{usd(totals.shippingUSD)} USD</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Estimated Tax:</span>
                    <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{usd(totals.taxUSD)} USD</span>
                  </div>
                  <div className={`flex justify-between pt-2.5 border-t border-[#E8E1D9] dark:border-[#262320] font-serif text-xl font-bold text-[#1A1918] dark:text-[#F5F2ED] ${totalsLoading ? 'opacity-60' : ''}`}>
                    <span>Total:</span>
                    <span>{usd(totals.totalUSD)} USD</span>
                  </div>
                </>
              )}
            </div>

            {step === 'cart' ? (
              <button
                onClick={() => { setSubmitError(null); setStep('checkout'); }}
                disabled={!totals || hasUnavailable || totalsLoading}
                className="w-full py-4 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] rounded text-xs sm:text-sm uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStep('cart')}
                  className="py-3 border border-[#D5CDC4] dark:border-[#38332E] text-[#1A1918] dark:text-[#F5F2ED] rounded text-xs sm:text-sm uppercase tracking-wider font-bold hover:border-[#1A1918] dark:hover:border-[#F5F2ED] cursor-pointer"
                >
                  Back to Cart
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={submitting || !totals || hasUnavailable}
                  className="py-3 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] rounded text-xs sm:text-sm uppercase tracking-wider font-bold cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                  {paymentMethod === 'card' ? 'Continue to Payment' : paymentMethod === 'memo' ? 'Request Memo' : 'Place Order'}
                </button>
              </div>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-[#8C827A] dark:text-[#A69C94] pt-1 text-center">
              <Lock className="w-3.5 h-3.5 text-[#C5A880] shrink-0" />
              <span>
                Prices are confirmed by our server at checkout.
                {checkout.cardEnabled ? ' Card details are entered only on the payment provider’s page.' : ' No payment is taken on this site.'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const PaymentOption: React.FC<{
  checked: boolean;
  disabled?: boolean;
  onSelect: () => void;
  title: string;
  detail: string;
  badge: string;
}> = ({ checked, disabled, onSelect, title, detail, badge }) => (
  <label
    className={`p-3 rounded border flex items-center justify-between gap-3 ${
      disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
    } ${checked ? 'border-[#1A1918] dark:border-[#C5A880] bg-[#FAF8F5] dark:bg-[#121110]' : 'border-[#E8E1D9] dark:border-[#262320]'}`}
  >
    <div className="flex items-center gap-2">
      <input
        type="radio"
        name="payment"
        checked={checked}
        disabled={disabled}
        onChange={onSelect}
        className="accent-[#1A1918] dark:accent-[#C5A880]"
      />
      <div>
        <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">{title}</span>
        <span className="text-xs text-[#78716C] dark:text-[#A69C94]">{detail}</span>
      </div>
    </div>
    <span className="text-[#8C6D44] dark:text-[#C5A880] font-bold text-xs shrink-0">{badge}</span>
  </label>
);

const ConfirmationView: React.FC<{
  confirmation: Confirmation | null;
  outcome?: CheckoutReturn['outcome'];
  signedIn: boolean;
  copied: boolean;
  onCopy: (link: string) => void;
  onFinish: () => void;
}> = ({ confirmation, outcome, signedIn, copied, onCopy, onFinish }) => {
  if (!confirmation) {
    return (
      <div className="py-20 text-center text-sm text-[#78716C] dark:text-[#A69C94] flex flex-col items-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-[#C5A880]" />
        Checking your order…
      </div>
    );
  }

  const finishButton = (
    <button
      onClick={onFinish}
      className="w-full py-3.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded text-xs sm:text-sm uppercase tracking-wider font-bold hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors cursor-pointer"
    >
      Return to Atelier Catalog
    </button>
  );

  if (confirmation.kind === 'error') {
    return (
      <div className="text-center py-10 space-y-6">
        <AlertCircle className="w-10 h-10 mx-auto text-[#B4553F]" />
        <p className="text-sm text-[#57534E] dark:text-[#D5CDC4]">{confirmation.message}</p>
        <p className="text-xs text-[#78716C] dark:text-[#A69C94]">Questions? Email {CONTACT_EMAIL}.</p>
        {finishButton}
      </div>
    );
  }

  if (confirmation.kind === 'memo') {
    return (
      <div className="text-center py-10 space-y-6">
        <div className="w-16 h-16 bg-[#FAF8F5] dark:bg-[#181614] border border-[#C5A880] rounded-full mx-auto flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-[#C5A880]" />
        </div>
        <div className="space-y-2">
          <span className="text-xs uppercase tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94] font-bold">Memo Request Received</span>
          <h3 className="font-serif text-3xl text-[#1A1918] dark:text-[#F5F2ED]">Awaiting Trade Desk Approval</h3>
          <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] max-w-sm mx-auto font-light leading-relaxed">
            The stones below are held for you while the desk reviews your request. You can follow each memo in your Member Portal.
          </p>
        </div>
        <div className="p-5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg text-left text-xs sm:text-sm space-y-2">
          {confirmation.memos.map((m) => (
            <div key={m.id} className="flex justify-between gap-3 border-b last:border-b-0 border-[#F2ECE4] dark:border-[#262320] pb-1.5">
              <span className="text-[#1A1918] dark:text-[#F5F2ED]">
                <span className="font-mono font-bold">{m.id}</span> — {m.stoneName}
              </span>
              <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] shrink-0">{usd(m.declaredValueUSD)}</span>
            </div>
          ))}
        </div>
        {finishButton}
      </div>
    );
  }

  const { order, orderLink, wireInstructions } = confirmation;
  const confirming = outcome === 'success' && order.status === 'pending_payment';
  const heading =
    order.status === 'paid' || order.status === 'shipped' || order.status === 'completed'
      ? 'Payment Received — Thank You'
      : confirming
        ? 'Confirming Your Payment…'
        : order.status === 'processing_payment'
          ? 'Your Payment Is Processing'
          : order.status === 'awaiting_wire'
            ? 'Order Reserved — Awaiting Bank Wire'
            : order.status === 'cancelled' && outcome === 'cancelled'
              ? 'Payment Cancelled'
              : order.statusLabel;

  return (
    <div className="text-center py-10 space-y-6">
      <div className="w-16 h-16 bg-[#FAF8F5] dark:bg-[#181614] border border-[#C5A880] rounded-full mx-auto flex items-center justify-center">
        {confirming ? <Loader2 className="w-8 h-8 text-[#C5A880] animate-spin" /> : <CheckCircle2 className="w-8 h-8 text-[#C5A880]" />}
      </div>

      <div className="space-y-2">
        <span className="text-xs uppercase tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94] font-bold">
          Order {order.reference}
        </span>
        <h3 className="font-serif text-3xl text-[#1A1918] dark:text-[#F5F2ED]">{heading}</h3>
        <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] max-w-sm mx-auto font-light leading-relaxed">
          {order.status === 'awaiting_wire' &&
            'Our trade desk will email your pro-forma invoice. The stones stay reserved for you until the time below; they are yours once the wire clears.'}
          {order.status === 'processing_payment' && 'Bank payments can take a few days to arrive. The stones stay reserved for you meanwhile.'}
          {confirming && 'The payment provider is confirming your payment. This usually takes a few seconds.'}
          {order.status === 'cancelled' && outcome === 'cancelled' && 'No payment was taken and the stones have been released.'}
          {order.status === 'paid' && 'The trade desk will arrange insured delivery and send tracking details.'}
        </p>
      </div>

      <div className="p-5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg text-left text-xs sm:text-sm space-y-2">
        {order.items.map((i) => (
          <div key={i.stoneId} className="flex justify-between gap-3">
            <span className="text-[#57534E] dark:text-[#D5CDC4]">{i.name}</span>
            <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] shrink-0">{usd(i.priceUSD)}</span>
          </div>
        ))}
        <div className="flex justify-between border-t border-[#F2ECE4] dark:border-[#262320] pt-2">
          <span className="text-[#78716C] dark:text-[#A69C94]">Total:</span>
          <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{usd(order.totalUSD)} USD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#78716C] dark:text-[#A69C94]">Status:</span>
          <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{order.statusLabel}</span>
        </div>
        {order.reservedUntil && (
          <div className="flex justify-between">
            <span className="text-[#78716C] dark:text-[#A69C94] flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Reserved until:</span>
            <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{new Date(order.reservedUntil).toLocaleString()}</span>
          </div>
        )}
        {order.tracking && (
          <div className="flex justify-between">
            <span className="text-[#78716C] dark:text-[#A69C94]">Tracking:</span>
            <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{order.courier} {order.tracking}</span>
          </div>
        )}
      </div>

      {wireInstructions && order.status === 'awaiting_wire' && (
        <div className="p-4 bg-[#FAF6EF] dark:bg-[#1C1814] border border-[#C5A880] rounded-lg text-left text-xs sm:text-sm">
          <span className="font-bold uppercase tracking-wider text-[#8C6D44] dark:text-[#C5A880] block mb-1">Bank details</span>
          <p className="whitespace-pre-wrap text-[#1A1918] dark:text-[#F5F2ED]">{wireInstructions}</p>
          <p className="mt-2 text-[#78716C] dark:text-[#A69C94]">Use reference {order.reference} on your transfer.</p>
        </div>
      )}

      {orderLink && !signedIn && (
        <div className="text-left text-xs text-[#78716C] dark:text-[#A69C94] space-y-1.5">
          <p>Keep this private link to check your order status:</p>
          <button
            type="button"
            onClick={() => onCopy(orderLink)}
            className="inline-flex items-center gap-1.5 font-bold text-[#8C6D44] dark:text-[#C5A880] underline cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" /> {copied ? 'Link copied' : 'Copy order link'}
          </button>
        </div>
      )}
      {signedIn && <p className="text-xs text-[#78716C] dark:text-[#A69C94]">You can follow this order in your Member Portal.</p>}

      {finishButton}
    </div>
  );
};

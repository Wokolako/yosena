'use client';

import React, { useState, useEffect } from 'react';
import { CartItem } from '../types';
import { createOrder, cartToOrderItems } from '../lib/api';
import { 
  X, 
  Trash2, 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle2, 
  Lock 
} from 'lucide-react';

/** Courier names as the trade desk records them on an order. */
const SHIPPING_LABELS: Record<'armored' | 'usps' | 'ferrari', string> = {
  armored: 'Malca-Amit Armored Vault Transfer',
  usps: 'USPS Registered Insured Mail',
  ferrari: 'Ferrari Armored High-Value Courier',
};

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  onRemoveItem: (gemstoneId: string) => void;
  onClearCart: () => void;
  onSelectStone: (stone: any) => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  cartItems,
  onRemoveItem,
  onClearCart,
  onSelectStone,
}) => {
  const [shippingMethod, setShippingMethod] = useState<'armored' | 'usps' | 'ferrari'>('armored');
  const [couponCode, setCouponCode] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [couponFeedback, setCouponFeedback] = useState<string>('');
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'checkout' | 'confirmation'>('cart');
  const [orderRef, setOrderRef] = useState<string>('');
  const [isPlacingOrder, setIsPlacingOrder] = useState<boolean>(false);
  const [orderError, setOrderError] = useState<string | null>(null);

  const [checkoutForm, setCheckoutForm] = useState({
    businessName: '',
    contactName: '',
    email: '',
    phone: '',
    vaultAddress: '',
    city: '',
    country: 'United Kingdom',
    paymentPreference: 'wire',
  });

  // Close on Escape and lock background scroll while the drawer is open.
  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const subtotal = cartItems.reduce((sum, item) => sum + item.gemstone.priceUSD * item.quantity, 0);

  const shippingCost = 
    shippingMethod === 'ferrari' ? 320 :
    shippingMethod === 'armored' ? 250 : 45;

  const discountAmount = Math.round(subtotal * (discountPercent / 100));
  const estimatedTax = subtotal > 0 ? Math.round((subtotal - discountAmount) * 0.05) : 0;
  const grandTotal = subtotal - discountAmount + shippingCost + estimatedTax;

  const applyCoupon = (e: React.FormEvent) => {
    e.preventDefault();
    if (couponCode.toUpperCase() === 'JEWELLER10' || couponCode.toUpperCase() === 'ATELIER') {
      setDiscountPercent(10);
      setCouponFeedback('10% B2B Atelier Trade Discount applied.');
    } else {
      setCouponFeedback('Invalid code. Try "JEWELLER10" for trade courtesy.');
    }
  };

  // The order reference shown on the confirmation is the id the trade desk
  // assigned, so the dossier the client quotes back actually exists on record.
  const handleCompleteOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isPlacingOrder) return;

    setIsPlacingOrder(true);
    setOrderError(null);

    try {
      const order = await createOrder({
        items: cartToOrderItems(cartItems),
        clientName: checkoutForm.contactName,
        companyName: checkoutForm.businessName,
        email: checkoutForm.email,
        paymentMethod:
          checkoutForm.paymentPreference === 'wire'
            ? 'Wire Transfer (Escrow)'
            : checkoutForm.paymentPreference,
        shippingService: SHIPPING_LABELS[shippingMethod],
      });

      setOrderRef(order.id);
      setCheckoutStep('confirmation');
    } catch (err: any) {
      setOrderError(err?.message ?? 'The order could not be registered.');
    } finally {
      setIsPlacingOrder(false);
    }
  };

  const handleFinish = () => {
    onClearCart();
    setCheckoutStep('cart');
    onClose();
  };

  return (
    <div
      onClick={onClose}
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
            <h2 className="font-serif text-xl sm:text-2xl text-[#1A1918] dark:text-[#F5F2ED]">
              {checkoutStep === 'cart' && `Atelier Vault Cart (${cartItems.length})`}
              {checkoutStep === 'checkout' && 'Secure Checkout & Memo Allocation'}
              {checkoutStep === 'confirmation' && 'Order / Memo Allocation Dossier'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-[#78716C] dark:text-[#A69C94] hover:text-[#1A1918] dark:hover:text-[#F5F2ED] hover:bg-[#F2ECE4] dark:hover:bg-[#23201D] rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* STEP 1: CART ITEMS LIST */}
          {checkoutStep === 'cart' && (
            <>
              {cartItems.length === 0 ? (
                <div className="text-center py-20 space-y-4">
                  <div className="w-16 h-16 bg-[#F2ECE4] dark:bg-[#23201D] rounded-full flex items-center justify-center mx-auto text-[#8C827A] dark:text-[#A69C94]">
                    <ShoppingBag className="w-8 h-8" />
                  </div>
                  <h3 className="font-serif text-2xl text-[#1A1918] dark:text-[#F5F2ED]">Your Cart is Empty</h3>
                  <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] max-w-xs mx-auto font-light leading-relaxed">
                    Explore our collection of investment diamonds and rare untreated gemstones to initiate a consignment memo or wire allocation.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cartItems.map((item) => (
                    <div
                      key={item.gemstone.id}
                      className="p-4 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg flex items-start gap-4 shadow-sm"
                    >
                      <img
                        src={item.gemstone.image}
                        alt={item.gemstone.name}
                        onClick={() => {
                          onSelectStone(item.gemstone);
                          onClose();
                        }}
                        className="w-20 h-20 rounded object-cover cursor-pointer hover:opacity-90 transition-opacity shrink-0 bg-[#1A1918]"
                      />
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 
                            onClick={() => {
                              onSelectStone(item.gemstone);
                              onClose();
                            }}
                            className="font-serif text-base font-semibold text-[#1A1918] dark:text-[#F5F2ED] truncate cursor-pointer hover:text-[#C5A880]"
                          >
                            {item.gemstone.name}
                          </h4>
                          <button
                            onClick={() => onRemoveItem(item.gemstone.id)}
                            className="text-[#8C827A] dark:text-[#A69C94] hover:text-[#DC2626] dark:hover:text-[#EF4444] transition-colors p-1"
                            title="Remove stone"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                        <p className="text-xs text-[#78716C] dark:text-[#A69C94]">
                          {item.gemstone.shape} • {item.gemstone.carat} ct • {item.gemstone.certification}
                        </p>
                        <div className="flex items-center justify-between pt-1">
                          <span className="font-serif text-base font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                            ${item.gemstone.priceUSD.toLocaleString()} USD
                          </span>
                          <span className="text-xs text-[#8C827A] dark:text-[#A69C94]">
                            Ref: {item.gemstone.certNumber}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Shipping Options */}
                  <div className="p-4 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg space-y-3">
                    <span className="text-xs uppercase tracking-wider text-[#78716C] dark:text-[#A69C94] font-bold block">
                      Select Insured Transit Logistics
                    </span>
                    <div className="space-y-2 text-xs sm:text-sm">
                      <label className={`p-3 rounded border flex items-center justify-between cursor-pointer ${shippingMethod === 'armored' ? 'border-[#1A1918] dark:border-[#C5A880] bg-[#FAF8F5] dark:bg-[#121110]' : 'border-[#E8E1D9] dark:border-[#262320]'}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingMethod === 'armored'}
                            onChange={() => setShippingMethod('armored')}
                            className="accent-[#1A1918] dark:accent-[#C5A880]"
                          />
                          <div>
                            <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">Malca-Amit Armored Express</span>
                            <span className="text-xs text-[#78716C] dark:text-[#A69C94]">Full underwriters coverage, door-to-vault</span>
                          </div>
                        </div>
                        <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">$250</span>
                      </label>

                      <label className={`p-3 rounded border flex items-center justify-between cursor-pointer ${shippingMethod === 'ferrari' ? 'border-[#1A1918] dark:border-[#C5A880] bg-[#FAF8F5] dark:bg-[#121110]' : 'border-[#E8E1D9] dark:border-[#262320]'}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingMethod === 'ferrari'}
                            onChange={() => setShippingMethod('ferrari')}
                            className="accent-[#1A1918] dark:accent-[#C5A880]"
                          />
                          <div>
                            <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">Ferrari Logistics International</span>
                            <span className="text-xs text-[#78716C] dark:text-[#A69C94]">Dedicated armed escort &amp; customs liaison</span>
                          </div>
                        </div>
                        <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">$320</span>
                      </label>

                      <label className={`p-3 rounded border flex items-center justify-between cursor-pointer ${shippingMethod === 'usps' ? 'border-[#1A1918] dark:border-[#C5A880] bg-[#FAF8F5] dark:bg-[#121110]' : 'border-[#E8E1D9] dark:border-[#262320]'}`}>
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="shipping"
                            checked={shippingMethod === 'usps'}
                            onChange={() => setShippingMethod('usps')}
                            className="accent-[#1A1918] dark:accent-[#C5A880]"
                          />
                          <div>
                            <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">USPS RTC Registered Mail</span>
                            <span className="text-xs text-[#78716C] dark:text-[#A69C94]">Locked cage transit (Domestic only)</span>
                          </div>
                        </div>
                        <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">$45</span>
                      </label>
                    </div>
                  </div>

                  {/* Coupon Code input */}
                  <form onSubmit={applyCoupon} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Trade promo code (e.g. JEWELLER10)"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      className="flex-1 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E0D8CE] dark:border-[#332F2B] rounded px-3.5 py-2.5 text-xs sm:text-sm text-[#1A1918] dark:text-[#F5F2ED] uppercase tracking-wider focus:outline-none font-medium"
                    />
                    <button
                      type="submit"
                      className="px-4 py-2.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] text-xs sm:text-sm uppercase tracking-wider rounded font-bold cursor-pointer hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors"
                    >
                      Apply
                    </button>
                  </form>
                  {couponFeedback && (
                    <p className="text-xs sm:text-sm text-[#8C6D44] dark:text-[#C5A880] font-bold">{couponFeedback}</p>
                  )}
                </div>
              )}
            </>
          )}

          {/* STEP 2: CHECKOUT FORM */}
          {checkoutStep === 'checkout' && (
            <form id="checkout-form" onSubmit={handleCompleteOrder} className="space-y-4 text-xs sm:text-sm">
              <div className="bg-[#FFFFFF] dark:bg-[#181614] p-5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] space-y-3">
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] uppercase tracking-wider block">
                  Atelier &amp; Consignee Details
                </span>
                
                <div>
                  <label className="block text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">Company / Atelier Name *</label>
                  <input
                    type="text"
                    required
                    value={checkoutForm.businessName}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, businessName: e.target.value })}
                    placeholder="Sterling Goldsmiths Ltd"
                    className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded p-2.5 text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">Contact Person *</label>
                    <input
                      type="text"
                      required
                      value={checkoutForm.contactName}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, contactName: e.target.value })}
                      placeholder="Arthur Sterling"
                      className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded p-2.5 text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">Business Email *</label>
                    <input
                      type="email"
                      required
                      value={checkoutForm.email}
                      onChange={(e) => setCheckoutForm({ ...checkoutForm, email: e.target.value })}
                      placeholder="trade@sterling.com"
                      className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded p-2.5 text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[#78716C] dark:text-[#A69C94] mb-1 font-semibold">Secure Vault Delivery Address *</label>
                  <input
                    type="text"
                    required
                    value={checkoutForm.vaultAddress}
                    onChange={(e) => setCheckoutForm({ ...checkoutForm, vaultAddress: e.target.value })}
                    placeholder="Suite 402, 14 Hatton Garden"
                    className="w-full bg-[#FAF8F5] dark:bg-[#121110] border border-[#E0D8CE] dark:border-[#332F2B] rounded p-2.5 text-[#1A1918] dark:text-[#F5F2ED] focus:outline-none font-medium"
                  />
                </div>
              </div>

              {/* Transaction Method */}
              <div className="bg-[#FFFFFF] dark:bg-[#181614] p-5 rounded-lg border border-[#E8E1D9] dark:border-[#262320] space-y-3">
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] uppercase tracking-wider block">
                  Settlement &amp; Memo Type
                </span>
                <label className="p-3 rounded border border-[#E8E1D9] dark:border-[#262320] flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={checkoutForm.paymentPreference === 'memo'}
                      onChange={() => setCheckoutForm({ ...checkoutForm, paymentPreference: 'memo' })}
                      className="accent-[#1A1918] dark:accent-[#C5A880]"
                    />
                    <div>
                      <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">14-Day Inspection Memo (Net 0)</span>
                      <span className="text-xs text-[#78716C] dark:text-[#A69C94]">Dispatch on consignment; zero funds debited today</span>
                    </div>
                  </div>
                  <span className="text-[#8C6D44] dark:text-[#C5A880] font-bold">Trade Memo</span>
                </label>

                <label className="p-3 rounded border border-[#E8E1D9] dark:border-[#262320] flex items-center justify-between cursor-pointer">
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="payment"
                      checked={checkoutForm.paymentPreference === 'wire'}
                      onChange={() => setCheckoutForm({ ...checkoutForm, paymentPreference: 'wire' })}
                      className="accent-[#1A1918] dark:accent-[#C5A880]"
                    />
                    <div>
                      <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED] block">Bank Wire Transfer (SWIFT / CHAPS)</span>
                      <span className="text-xs text-[#78716C] dark:text-[#A69C94]">Official commercial pro-forma invoice issued</span>
                    </div>
                  </div>
                  <span className="text-[#1A1918] dark:text-[#F5F2ED] font-bold">Pro-Forma</span>
                </label>
              </div>
            </form>
          )}

          {/* STEP 3: ORDER CONFIRMATION */}
          {checkoutStep === 'confirmation' && (
            <div className="text-center py-10 space-y-6">
              <div className="w-16 h-16 bg-[#FAF8F5] dark:bg-[#181614] border border-[#C5A880] rounded-full mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8 text-[#C5A880]" />
              </div>

              <div className="space-y-2">
                <span className="text-xs uppercase tracking-[0.25em] text-[#8C827A] dark:text-[#A69C94] font-bold">
                  Thank You • Dossier Dispatched
                </span>
                <h3 className="font-serif text-3xl text-[#1A1918] dark:text-[#F5F2ED]">
                  Consignment #{orderRef} Logged
                </h3>
                <p className="text-xs sm:text-sm text-[#78716C] dark:text-[#A69C94] max-w-sm mx-auto font-light leading-relaxed">
                  Your request has been routed to our Trade Desk at <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">consult@yosenamora.com</span>. An armored courier release manifest has been initiated.
                </p>
              </div>

              <div className="p-5 bg-[#FFFFFF] dark:bg-[#181614] border border-[#E8E1D9] dark:border-[#262320] rounded-lg text-left text-xs sm:text-sm space-y-2">
                <div className="flex justify-between border-b border-[#F2ECE4] dark:border-[#262320] pb-1.5">
                  <span className="text-[#78716C] dark:text-[#A69C94]">Consignee:</span>
                  <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">{checkoutForm.businessName || 'Atelier Sterling'}</span>
                </div>
                <div className="flex justify-between border-b border-[#F2ECE4] dark:border-[#262320] pb-1.5">
                  <span className="text-[#78716C] dark:text-[#A69C94]">Total Declared Value:</span>
                  <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">${grandTotal.toLocaleString()} USD</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#78716C] dark:text-[#A69C94]">Courier:</span>
                  <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">Malca-Amit Armored Underwriters</span>
                </div>
              </div>

              <button
                onClick={handleFinish}
                className="w-full py-3.5 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] rounded text-xs sm:text-sm uppercase tracking-wider font-bold hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] transition-colors cursor-pointer"
              >
                Return to Atelier Catalog
              </button>
            </div>
          )}

        </div>

        {/* Drawer Footer */}
        {cartItems.length > 0 && checkoutStep !== 'confirmation' && (
          <div className="p-5 border-t border-[#E8E1D9] dark:border-[#262320] bg-[#FFFFFF] dark:bg-[#181614] space-y-3.5">
            <div className="space-y-1.5 text-xs sm:text-sm text-[#57534E] dark:text-[#D5CDC4]">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">${subtotal.toLocaleString()} USD</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-[#8C6D44] dark:text-[#C5A880] font-semibold">
                  <span>Atelier Trade Courtesy:</span>
                  <span>-${discountAmount.toLocaleString()} USD</span>
                </div>
              )}
              <div className="flex justify-between">
                <span>Armored Courier &amp; Insurance:</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">${shippingCost} USD</span>
              </div>
              <div className="flex justify-between">
                <span>Estimated Tax (Avalara Sim):</span>
                <span className="font-bold text-[#1A1918] dark:text-[#F5F2ED]">${estimatedTax.toLocaleString()} USD</span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-[#E8E1D9] dark:border-[#262320] font-serif text-xl font-bold text-[#1A1918] dark:text-[#F5F2ED]">
                <span>Total Declared:</span>
                <span>${grandTotal.toLocaleString()} USD</span>
              </div>
            </div>

            {checkoutStep === 'cart' ? (
              <button
                onClick={() => setCheckoutStep('checkout')}
                className="w-full py-4 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] rounded text-xs sm:text-sm uppercase tracking-[0.2em] font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <span>Proceed to Allocation Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCheckoutStep('cart')}
                  className="py-3 border border-[#D5CDC4] dark:border-[#38332E] text-[#1A1918] dark:text-[#F5F2ED] rounded text-xs sm:text-sm uppercase tracking-wider font-bold hover:border-[#1A1918] dark:hover:border-[#F5F2ED] cursor-pointer"
                >
                  Back to Cart
                </button>
                <button
                  type="submit"
                  form="checkout-form"
                  disabled={isPlacingOrder}
                  className="py-3 bg-[#1A1918] dark:bg-[#F5F2ED] text-[#FAF8F5] dark:text-[#1A1918] hover:bg-[#33312E] dark:hover:bg-[#E3DDD4] rounded text-xs sm:text-sm uppercase tracking-wider font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isPlacingOrder ? 'Registering…' : 'Confirm Allocation'}
                </button>
              </div>
            )}

            {orderError && checkoutStep === 'checkout' && (
              <p role="alert" className="text-xs sm:text-sm font-semibold text-[#A3524A] dark:text-[#E0897F] text-center">
                {orderError}
              </p>
            )}

            <div className="flex items-center justify-center gap-1.5 text-xs text-[#8C827A] dark:text-[#A69C94] pt-1">
              <Lock className="w-3.5 h-3.5 text-[#C5A880]" />
              <span>Encrypted 256-bit vault security protocol</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

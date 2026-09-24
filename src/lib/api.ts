'use client';

import {
  Gemstone,
  ConsultationService,
  BlogPost,
  BookingAppointment,
  CartItem,
} from '../types';

/**
 * Single entry point for every call the browser makes to the API.
 *
 * Components never fetch directly: they call these helpers, which normalise the
 * `{ success, data }` envelope the route handlers return and raise a real Error
 * on failure so callers only ever branch on one thing.
 */

/**
 * Authentication is handled by Clerk, whose session cookie is sent
 * automatically on same-origin requests — there is no token to attach here.
 */

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(path, init);
  } catch {
    throw new Error('Could not reach the trade desk. Check your connection.');
  }

  let body: any = null;
  try {
    body = await res.json();
  } catch {
    // Non-JSON response (a proxy error page, say) — fall through to the status check.
  }

  if (!res.ok || !body?.success) {
    throw new Error(body?.error ?? `Request failed (${res.status}).`);
  }

  return body.data as T;
}

const qs = (params: Record<string, string | number | boolean | undefined>): string => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};

const jsonPost = (payload: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

/* ---------------------------------------------------------------- catalog */

export interface GemstoneFilters {
  category?: string;
  shape?: string;
  minCarat?: number;
  maxCarat?: number;
  minPrice?: number;
  maxPrice?: number;
  status?: string;
  featured?: boolean;
  search?: string;
}

export const fetchGemstones = (filters: GemstoneFilters = {}): Promise<Gemstone[]> =>
  request<Gemstone[]>(`/api/gemstones${qs(filters as Record<string, any>)}`);

export const fetchGemstone = (id: string): Promise<Gemstone> =>
  request<Gemstone>(`/api/gemstones/${encodeURIComponent(id)}`);

/** Trade-desk inventory move. Rejected by the API unless the caller is staff. */
export const updateGemstoneStatus = (
  id: string,
  status: 'In Vault' | 'On Memo' | 'Reserved'
): Promise<Gemstone> =>
  request<Gemstone>(`/api/gemstones/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

/* ---------------------------------------------------------------- content */

export const fetchServices = (): Promise<ConsultationService[]> =>
  request<ConsultationService[]>('/api/services');

export const fetchBlogPosts = (category?: string): Promise<BlogPost[]> =>
  request<BlogPost[]>(`/api/blog${qs({ category })}`);

export interface PolicyDocument {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  sections: { heading: string; text: string }[];
}

export const fetchPolicy = (slug: string): Promise<PolicyDocument> =>
  request<PolicyDocument>(`/api/policies${qs({ slug })}`);

/* --------------------------------------------------------------- bookings */

export interface BookingInput {
  serviceId: string;
  serviceTitle: string;
  date: string;
  time: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  specificInquiry: string;
}

export const fetchBookings = (email?: string): Promise<BookingAppointment[]> =>
  request<BookingAppointment[]>(`/api/bookings${qs({ email })}`);

export const createBooking = (input: BookingInput): Promise<BookingAppointment> =>
  request<BookingAppointment>('/api/bookings', jsonPost(input));

/* ------------------------------------------------------------------ memos */

export interface Memo {
  id: string;
  userId: string;
  memberId: string;
  companyName: string;
  stoneId: string;
  stoneName: string;
  dateDispatched: string;
  daysRemaining: number;
  courier: string;
  tracking: string;
  declaredValueUSD: number;
  status: string;
  notes?: string;
  createdAt: string;
}

/** Scoped to the signed-in member by the API unless the caller is an admin. */
export const fetchMemos = (): Promise<Memo[]> => request<Memo[]>('/api/memos');

/* ----------------------------------------------------------------- quotes */

export interface QuoteCalculationInput {
  gemType: string;
  shape: string;
  caratMin: number;
  caratMax: number;
  quantity: number;
  certification?: string;
}

export interface QuoteCalculation {
  gemType: string;
  shape: string;
  avgCarat: number;
  quantity: number;
  certification: string;
  estimatedUnitPriceUSD: number;
  estimatedTotalUSD: number;
  volumeDiscountPercentage: number;
  currency: string;
  pricingValidityDays: number;
}

/**
 * Pricing lives on the server so the rate card is never shipped to the browser.
 * The calculate branch returns `calculation` rather than `data`, so this one
 * unwraps the envelope itself instead of going through `request`.
 */
export async function calculateQuote(input: QuoteCalculationInput): Promise<QuoteCalculation> {
  let res: Response;
  try {
    res = await fetch('/api/quotes', jsonPost({ action: 'calculate', ...input }));
  } catch {
    throw new Error('Could not reach the trade desk. Check your connection.');
  }

  const body = await res.json().catch(() => null);
  if (!res.ok || !body?.success || !body.calculation) {
    throw new Error(body?.error ?? 'Could not price this configuration.');
  }
  return body.calculation as QuoteCalculation;
}

export interface QuoteSubmissionInput {
  gemType: string;
  shape: string;
  caratMin: number;
  caratMax: number;
  targetBudget: number;
  quantity: number;
  certificationPreference: string;
  jewellerBusiness: string;
  contactEmail: string;
  notes: string;
}

export const submitQuote = (input: QuoteSubmissionInput): Promise<unknown> =>
  request<unknown>('/api/quotes', jsonPost(input));

/* ----------------------------------------------------------------- orders */

export interface OrderInput {
  items: Array<{
    gemstoneId: string;
    name: string;
    carat: number;
    priceUSD: number;
    quantity: number;
  }>;
  clientName: string;
  companyName: string;
  email: string;
  paymentMethod?: string;
  shippingService?: string;
}

export interface Order {
  id: string;
  clientName: string;
  companyName: string;
  email: string;
  items: OrderInput['items'];
  totalUSD: number;
  paymentMethod: string;
  shippingService: string;
  status: string;
  createdAt: string;
}

export const createOrder = (input: OrderInput): Promise<Order> =>
  request<Order>('/api/orders', jsonPost(input));

/** Maps the cart's nested shape onto the flat line items the API stores. */
export const cartToOrderItems = (cartItems: CartItem[]): OrderInput['items'] =>
  cartItems.map((item) => ({
    gemstoneId: item.gemstone.id,
    name: item.gemstone.name,
    carat: item.gemstone.carat,
    priceUSD: item.gemstone.priceUSD,
    quantity: item.quantity,
  }));

/* ------------------------------------------------------------------ admin */

/**
 * Trade desk operations. Every one of these is refused by the API unless the
 * signed-in account carries the `admin` role in the database, so the UI hiding
 * them is a convenience rather than the actual control.
 */

const jsonSend = (method: string, payload: unknown): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
});

export const adminFetchGemstones = (): Promise<Gemstone[]> =>
  request<Gemstone[]>('/api/admin/gemstones');

export const adminCreateGemstone = (stone: Partial<Gemstone>): Promise<Gemstone> =>
  request<Gemstone>('/api/admin/gemstones', jsonSend('POST', stone));

export const adminUpdateGemstone = (id: string, stone: Partial<Gemstone>): Promise<Gemstone> =>
  request<Gemstone>(`/api/admin/gemstones/${encodeURIComponent(id)}`, jsonSend('PUT', stone));

export const adminDeleteGemstone = (id: string): Promise<unknown> =>
  request<unknown>(`/api/admin/gemstones/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const adminFetchBlogPosts = (): Promise<BlogPost[]> =>
  request<BlogPost[]>('/api/admin/blog');

export const adminSaveBlogPost = (post: Partial<BlogPost>): Promise<BlogPost> =>
  request<BlogPost>('/api/admin/blog', jsonSend('POST', post));

export const adminDeleteBlogPost = (id: string): Promise<unknown> =>
  request<unknown>(`/api/admin/blog${qs({ id })}`, { method: 'DELETE' });

export const adminFetchServices = (): Promise<ConsultationService[]> =>
  request<ConsultationService[]>('/api/admin/services');

export const adminSaveService = (service: Partial<ConsultationService>): Promise<ConsultationService> =>
  request<ConsultationService>('/api/admin/services', jsonSend('POST', service));

export const adminDeleteService = (id: string): Promise<unknown> =>
  request<unknown>(`/api/admin/services${qs({ id })}`, { method: 'DELETE' });

export const adminFetchPolicies = (): Promise<PolicyDocument[]> =>
  request<PolicyDocument[]>('/api/admin/policies');

export const adminSavePolicy = (policy: Partial<PolicyDocument>): Promise<PolicyDocument> =>
  request<PolicyDocument>('/api/admin/policies', jsonSend('POST', policy));

export interface UploadedImage {
  name: string;
  url: string;
  bytes: number;
  contentType: string;
}

/**
 * Uploads a stone photograph and returns its URL.
 *
 * Sent as multipart rather than JSON, so the Content-Type header is left for
 * the browser to set with its own multipart boundary.
 */
export async function adminUploadImage(file: File): Promise<UploadedImage> {
  const body = new FormData();
  body.append('file', file);

  let res: Response;
  try {
    res = await fetch('/api/admin/uploads', { method: 'POST', body });
  } catch {
    throw new Error('Could not reach the trade desk. Check your connection.');
  }

  const payload = await res.json().catch(() => null);

  if (!res.ok || !payload?.success) {
    throw new Error(payload?.error ?? `Upload failed (${res.status}).`);
  }

  return payload.data as UploadedImage;
}

/** True when a gemstone's image URL points at our own store. */
export const isStoredUploadUrl = (url: string): boolean =>
  /^\/api\/uploads\/[0-9a-f]{32}\.(jpg|png|webp|avif)$/.test(String(url ?? ''));

/** Removes a stored image. Accepts the id or the URL held on the record. */
export const adminDeleteImage = (idOrUrl: string): Promise<unknown> =>
  request<unknown>(`/api/admin/uploads${qs({ id: idOrUrl })}`, { method: 'DELETE' });

export type GemCategory = 'Diamond' | 'Sapphire' | 'Emerald' | 'Ruby' | 'Spinel' | 'Tourmaline';
export type GemShape = 'Emerald Cut' | 'Cushion' | 'Round Brilliant' | 'Oval' | 'Pear' | 'Asscher';
export type StoneStatus = 'In Vault' | 'On Memo' | 'Reserved' | 'Sold';

export const GEM_CATEGORIES: GemCategory[] = ['Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Spinel', 'Tourmaline'];
export const GEM_SHAPES: GemShape[] = ['Emerald Cut', 'Cushion', 'Round Brilliant', 'Oval', 'Pear', 'Asscher'];
export const STONE_STATUSES: StoneStatus[] = ['In Vault', 'On Memo', 'Reserved', 'Sold'];

export interface Gemstone {
  id: string;
  name: string;
  category: GemCategory;
  shape: GemShape;
  carat: number;
  color: string;
  clarity: string;
  origin: string;
  treatment: string;
  certification: string;
  certNumber: string;
  priceUSD: number;
  pricePerCarat: number;
  dimensions: string;
  image: string;
  featured?: boolean;
  status: StoneStatus;
  description: string;
}

/** Only an 'In Vault' stone can be bought or requested on memo. */
export const isPurchasable = (stone: Pick<Gemstone, 'status'>) => stone.status === 'In Vault';

export interface ConsultationService {
  id: string;
  title: string;
  duration: string;
  type: 'Virtual' | 'In-Person Vault' | 'Atelier Visit';
  fee: string;
  description: string;
  suitableFor: string;
}

export interface BlogPost {
  id: string;
  title: string;
  category: 'Gemology' | 'Market Intelligence' | 'Ethical Sourcing' | 'Atelier Craft';
  readTime: string;
  date: string;
  excerpt: string;
  author: string;
  authorRole: string;
  image: string;
  content: string[];
  status?: 'draft' | 'published';
}

export interface PolicyContent {
  title: string;
  subtitle: string;
  sections: { heading: string; text: string }[];
}

export interface ShippingOption {
  id: string;
  label: string;
  description: string;
  priceUSD: number;
}

/** Public checkout settings the storefront needs to render the cart. Prices are always recomputed on the server. */
export interface CheckoutConfig {
  shippingOptions: ShippingOption[];
  cardEnabled: boolean;
  cardLimitUSD: number;
  cardRequiresApprovedAccount: boolean;
  promoCodesEnabled: boolean;
}

/** Everything the public site renders, loaded on the server from the data store. */
export interface SiteData {
  stones: Gemstone[];
  services: ConsultationService[];
  posts: BlogPost[];
  policies: Record<string, PolicyContent>;
  checkout: CheckoutConfig;
}

export interface CheckoutTotals {
  items: { stoneId: string; name: string; carat: number; priceUSD: number }[];
  unavailable: { stoneId: string; name: string; status: string }[];
  subtotalUSD: number;
  discountUSD: number;
  shippingUSD: number;
  taxUSD: number;
  totalUSD: number;
  promoApplied: string | null;
  promoError: string | null;
}

export type PaymentMethod = 'wire' | 'card' | 'memo';

export type OrderStatus =
  | 'pending_payment'
  | 'processing_payment'
  | 'awaiting_wire'
  | 'paid'
  | 'shipped'
  | 'completed'
  | 'cancelled'
  | 'expired'
  | 'refunded';

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending_payment: 'Awaiting online payment',
  processing_payment: 'Payment processing',
  awaiting_wire: 'Awaiting bank wire',
  paid: 'Paid',
  shipped: 'Shipped',
  completed: 'Completed',
  cancelled: 'Cancelled',
  expired: 'Expired (not paid in time)',
  refunded: 'Refunded',
};

/** The order view a customer (or a guest holding the order link) may see. */
export interface CustomerOrder {
  reference: string;
  status: string;
  statusLabel: string;
  paymentMethod: string;
  items: { stoneId: string; name: string; carat: number; priceUSD: number }[];
  subtotalUSD: number;
  discountUSD: number;
  shippingUSD: number;
  taxUSD: number;
  totalUSD: number;
  shippingLabel: string;
  tracking?: string | null;
  courier?: string | null;
  reservedUntil?: string | null;
  createdAt: string;
}

export interface CustomerMemo {
  id: string;
  stoneId: string;
  stoneName: string;
  declaredValueUSD: number;
  status: string;
  courier: string;
  tracking: string;
  dateDispatched: string | null;
  dueDate: string | null;
  daysRemaining: number | null;
  notes?: string;
  createdAt: string;
}

export interface BookingAppointment {
  id: string;
  serviceId: string;
  serviceTitle: string;
  date: string;
  time: string;
  clientName: string;
  companyName: string;
  email: string;
  phone: string;
  specificInquiry: string;
  status: 'Confirmed' | 'Pending Review' | 'Cancelled' | 'Completed';
  referenceNumber: string;
}

export type PageView =
  | 'home'
  | 'shop'
  | 'bookings'
  | 'quote-calc'
  | 'blog'
  | 'story'
  | 'vault'
  | 'signin'
  | 'signup';

export type PolicyType =
  | 'ethical-sourcing'
  | 'shipping-returns'
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'legal-notice'
  | 'accessibility';

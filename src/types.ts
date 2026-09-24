export type GemCategory = 'Diamond' | 'Sapphire' | 'Emerald' | 'Ruby' | 'Spinel' | 'Tourmaline';

export interface Gemstone {
  id: string;
  name: string;
  category: GemCategory;
  shape: 'Emerald Cut' | 'Cushion' | 'Round Brilliant' | 'Oval' | 'Pear' | 'Asscher';
  carat: number;
  color: string;
  clarity: string;
  origin: string;
  treatment: 'None (Untreated / Natural)' | 'Standard Heat Only';
  certification: 'GIA' | 'Gübelin' | 'SSEF' | 'IGI';
  certNumber: string;
  priceUSD: number;
  pricePerCarat: number;
  dimensions: string;
  image: string;
  featured?: boolean;
  status: 'In Vault' | 'On Memo' | 'Reserved';
  description: string;
}

export interface CartItem {
  gemstone: Gemstone;
  quantity: number;
  addedAt: string;
}

export interface ConsultationService {
  id: string;
  title: string;
  duration: string;
  type: 'Virtual' | 'In-Person Vault' | 'Atelier Visit';
  fee: string;
  description: string;
  suitableFor: string;
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
  status: 'Confirmed' | 'Pending Review';
  referenceNumber: string;
}

export interface B2BQuoteRequest {
  gemType: GemCategory;
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
}

export type PageView = 
  | 'home'
  | 'shop'
  | 'bookings'
  | 'quote-calc'
  | 'blog'
  | 'story'
  | 'vault'
  | 'join'
  | 'checkout'
  | 'admin';

export type PolicyType = 
  | 'ethical-sourcing'
  | 'shipping-returns'
  | 'terms'
  | 'privacy'
  | 'cookies'
  | 'legal-notice'
  | 'accessibility';

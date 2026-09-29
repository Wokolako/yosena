import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import type {
  Gemstone,
  ConsultationService,
  BlogPost,
  PolicyContent,
  PaymentMethod,
} from '../../src/types';

/*
 * JSON-file data store.
 *
 * Every read goes to disk and every change runs inside `db.transaction`, which is
 * fully synchronous: within one server process no other request can interleave
 * between the read and the write, so concurrent requests cannot overwrite each
 * other. Files are written to a temp file and renamed, so a crash never leaves a
 * half-written file behind.
 *
 * Limits: this is safe for a single server process only. Before running more than
 * one instance (or on serverless hosting, where the disk is temporary), move these
 * collections to a real database; only this file needs to change.
 */

export interface StoneRecord extends Gemstone {
  archived?: boolean;
  /** Set while a stone is held for an order or memo request. */
  reservedUntil?: string | null;
  reservedFor?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export type AccountRole = 'trade_partner' | 'admin' | 'jeweller';
export type AccountStatus = 'pending' | 'active' | 'disabled';

export interface UserRecord {
  id: string;
  email: string;
  passwordHash: string;
  clientName: string;
  companyName: string;
  memberId: string;
  accountRole: AccountRole;
  /** Missing on accounts created before approval existed; treated as 'active'. */
  status?: AccountStatus;
  tier: string;
  creditLineUSD: number;
  phone: string;
  address: string;
  isVerifiedTrade: boolean;
  createdAt: string;
  updatedAt?: string;
  lastLoginAt?: string;
  savedStoneIds: string[];
  preferences: { notifyDrops: boolean; notifyMemos: boolean };
}

export interface OrderItem {
  stoneId: string;
  name: string;
  carat: number;
  priceUSD: number;
}

export interface OrderRecord {
  id: string;
  reference: string;
  userId?: string | null;
  memberId?: string | null;
  contact: {
    clientName: string;
    companyName: string;
    email: string;
    phone: string;
    address: string;
    city: string;
    country: string;
  };
  items: OrderItem[];
  subtotalUSD: number;
  discountUSD: number;
  shippingUSD: number;
  taxUSD: number;
  totalUSD: number;
  promoCode?: string | null;
  shippingMethod: string;
  shippingLabel: string;
  paymentMethod: PaymentMethod;
  status: string;
  reservedUntil?: string | null;
  /** Secret included in the guest's order link. */
  accessToken: string;
  payment?: {
    provider: 'stripe';
    sessionId?: string;
    paymentIntentId?: string | null;
    paymentStatus?: string;
  } | null;
  courier?: string | null;
  tracking?: string | null;
  adminNotes?: string;
  attention?: string | null;
  history: { at: string; status: string; by: string; note?: string }[];
  createdAt: string;
  updatedAt: string;

  // Fields from records created before this version (read-only, shown in admin).
  clientName?: string;
  companyName?: string;
  email?: string;
  shippingService?: string;
}

export interface MemoRecord {
  id: string;
  userId: string;
  memberId: string;
  companyName: string;
  stoneId: string;
  stoneName: string;
  declaredValueUSD: number;
  status: string;
  courier: string;
  tracking: string;
  dateDispatched: string | null;
  dueDate?: string | null;
  daysRemaining?: number;
  notes?: string;
  adminNotes?: string;
  history?: { at: string; status: string; by: string; note?: string }[];
  createdAt: string;
  updatedAt?: string;
}

export interface BookingRecord {
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
  userId?: string | null;
  adminNotes?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface QuoteRecord {
  id: string;
  gemType: string;
  shape: string;
  caratSize?: number;
  caratMin: number;
  caratMax: number;
  clarityTier?: string;
  originPreference?: string;
  targetBudget?: number;
  quantity: number;
  certificationPreference?: string;
  jewellerBusiness: string;
  contactEmail: string;
  notes: string;
  estimatedUnitPrice?: number;
  estimatedTotal?: number;
  status: string;
  adminReply?: string;
  userId?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatLogRecord {
  id: string;
  timestamp: string;
  userMessage: string;
  botReply: string;
  handoff: boolean;
}

export interface AuditRecord {
  id: string;
  at: string;
  actorId: string;
  actorEmail: string;
  action: string;
  target: string;
  details?: Record<string, unknown>;
}

export interface ContentDoc {
  services: ConsultationService[];
  posts: BlogPost[];
  policies: Record<string, PolicyContent>;
}

export interface SettingsDoc {
  bookingTimes: string[];
  closedDates: string[];
  bookingWindowDays: number;
}

export interface ProcessedEvent {
  id: string;
  at: string;
}

interface Collections {
  gemstones: StoneRecord[];
  users: UserRecord[];
  orders: OrderRecord[];
  memos: MemoRecord[];
  bookings: BookingRecord[];
  quotes: QuoteRecord[];
  chat_logs: ChatLogRecord[];
  audit: AuditRecord[];
  webhook_events: ProcessedEvent[];
}

interface Documents {
  content: ContentDoc;
  settings: SettingsDoc;
}

type CollectionName = keyof Collections;
type DocumentName = keyof Documents;

const DEFAULT_SETTINGS: SettingsDoc = {
  bookingTimes: ['10:00 AM', '11:30 AM', '02:00 PM', '03:30 PM', '05:00 PM'],
  closedDates: [],
  bookingWindowDays: 14,
};

const SEED_DIR = path.join(process.cwd(), 'backend', 'seed');

export function dataDir(): string {
  return process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : path.join(process.cwd(), 'backend', 'data');
}

function fileFor(name: string): string {
  return path.join(dataDir(), `${name}.json`);
}

function seedFor<T>(name: string, fallback: T): T {
  const seedPath = path.join(SEED_DIR, `${name}.json`);
  if (fs.existsSync(seedPath)) {
    return JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  }
  return fallback;
}

function writeAtomic(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  const tmp = `${filePath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2), 'utf-8');
  fs.renameSync(tmp, filePath);
}

/** Reads a file, creating it from the seed (or the fallback) on first use. A corrupt file is an error, never silently replaced. */
function readFile<T>(name: string, fallback: T): T {
  const filePath = fileFor(name);
  if (!fs.existsSync(filePath)) {
    const initial = seedFor(name, fallback);
    writeAtomic(filePath, initial);
    return JSON.parse(JSON.stringify(initial));
  }
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

const COLLECTION_FALLBACK: Record<CollectionName, unknown[]> = {
  gemstones: [],
  users: [],
  orders: [],
  memos: [],
  bookings: [],
  quotes: [],
  chat_logs: [],
  audit: [],
  webhook_events: [],
};

const DOCUMENT_FALLBACK: Documents = {
  content: { services: [], posts: [], policies: {} },
  settings: DEFAULT_SETTINGS,
};

export interface Tx {
  get<K extends CollectionName>(name: K): Collections[K];
  set<K extends CollectionName>(name: K, rows: Collections[K]): void;
  getDoc<K extends DocumentName>(name: K): Documents[K];
  setDoc<K extends DocumentName>(name: K, doc: Documents[K]): void;
}

let inTransaction = false;

export const db = {
  /** Read-only snapshot of a collection. */
  all<K extends CollectionName>(name: K): Collections[K] {
    return readFile(name, COLLECTION_FALLBACK[name]) as Collections[K];
  },

  doc<K extends DocumentName>(name: K): Documents[K] {
    const value = readFile(name, DOCUMENT_FALLBACK[name]);
    return name === 'settings' ? ({ ...DEFAULT_SETTINGS, ...(value as SettingsDoc) } as Documents[K]) : value;
  },

  /**
   * Runs `fn` against fresh copies of the data and writes back whatever it `set`.
   * `fn` must be synchronous — that is what makes the read-modify-write atomic.
   */
  transaction<T>(fn: (tx: Tx) => T): T {
    if (inTransaction) throw new Error('Nested db.transaction calls are not supported.');
    inTransaction = true;
    const cache = new Map<string, unknown>();
    const dirty = new Set<string>();
    try {
      const tx: Tx = {
        get(name) {
          if (!cache.has(name)) cache.set(name, db.all(name));
          return cache.get(name) as any;
        },
        set(name, rows) {
          cache.set(name, rows);
          dirty.add(name);
        },
        getDoc(name) {
          if (!cache.has(name)) cache.set(name, db.doc(name));
          return cache.get(name) as any;
        },
        setDoc(name, doc) {
          cache.set(name, doc);
          dirty.add(name);
        },
      };
      const result = fn(tx);
      if (result && typeof (result as any).then === 'function') {
        throw new Error('db.transaction callbacks must be synchronous.');
      }
      for (const name of dirty) writeAtomic(fileFor(name), cache.get(name));
      return result;
    } finally {
      inTransaction = false;
    }
  },
};

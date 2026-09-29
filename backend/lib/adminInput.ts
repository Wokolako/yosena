import crypto from 'crypto';
import type { StoneRecord, OrderRecord, ContentDoc } from '../store/db';
import { HttpError } from './http';
import * as v from './validate';
import { GEM_CATEGORIES, GEM_SHAPES, STONE_STATUSES, ORDER_STATUS_LABELS } from '../../src/types';
import type { BlogPost, ConsultationService, PolicyContent } from '../../src/types';

const shortId = () => crypto.randomBytes(3).toString('hex');

/** Validates stone fields from the admin form. `partial` allows updating a subset. */
export function parseStone(body: any, partial: boolean): Partial<StoneRecord> {
  const has = (k: string) => !partial || body[k] !== undefined;
  const out: Partial<StoneRecord> = {};
  if (has('name')) out.name = v.str(body.name, 'Name', { required: true, max: 160 });
  if (has('category')) out.category = v.oneOf(body.category, 'Category', GEM_CATEGORIES);
  if (has('shape')) out.shape = v.oneOf(body.shape, 'Shape', GEM_SHAPES);
  if (has('carat')) out.carat = v.num(body.carat, 'Carat', { min: 0.01, max: 1000 });
  if (has('priceUSD')) out.priceUSD = v.num(body.priceUSD, 'Price', { min: 1, max: 1_000_000_000, integer: true });
  if (has('color')) out.color = v.str(body.color, 'Colour', { max: 120 });
  if (has('clarity')) out.clarity = v.str(body.clarity, 'Clarity', { max: 120 });
  if (has('origin')) out.origin = v.str(body.origin, 'Origin', { max: 160 });
  if (has('treatment')) out.treatment = v.str(body.treatment, 'Treatment', { max: 120 });
  if (has('certification')) out.certification = v.str(body.certification, 'Certification lab', { max: 60 });
  if (has('certNumber')) out.certNumber = v.str(body.certNumber, 'Certificate number', { max: 80 });
  if (has('dimensions')) out.dimensions = v.str(body.dimensions, 'Dimensions', { max: 80 });
  if (has('image')) out.image = v.url(body.image, 'Image URL', !partial);
  if (has('description')) out.description = v.str(body.description, 'Description', { max: 4000 });
  if (body.featured !== undefined) out.featured = !!body.featured;
  if (body.status !== undefined) out.status = v.oneOf(body.status, 'Status', STONE_STATUSES);
  if (body.archived !== undefined) out.archived = !!body.archived;
  return out;
}

export function newStoneId(category: string): string {
  return `${category.slice(0, 3).toLowerCase()}-${shortId()}`;
}

export const withPricePerCarat = (s: StoneRecord) => {
  s.pricePerCarat = s.carat > 0 ? Math.round(s.priceUSD / s.carat) : 0;
  return s;
};

export function adminOrderView(o: OrderRecord) {
  const { accessToken, ...rest } = o;
  const contact = o.contact ?? {
    clientName: o.clientName ?? '',
    companyName: o.companyName ?? '',
    email: o.email ?? '',
    phone: '',
    address: '',
    city: '',
    country: '',
  };
  return {
    ...rest,
    reference: o.reference ?? o.id,
    contact,
    items: (o.items || []).map((i: any) => ({ ...i, stoneId: i.stoneId ?? i.gemstoneId })),
    statusLabel: ORDER_STATUS_LABELS[o.status] ?? o.status,
    history: o.history ?? [],
    orderLink: accessToken ? `/?order=${encodeURIComponent(o.reference)}&t=${encodeURIComponent(accessToken)}` : null,
  };
}

const SERVICE_TYPES = ['Virtual', 'In-Person Vault', 'Atelier Visit'] as const;
const POST_CATEGORIES = ['Gemology', 'Market Intelligence', 'Ethical Sourcing', 'Atelier Craft'] as const;
export const POLICY_KEYS = ['ethical-sourcing', 'shipping-returns', 'terms', 'privacy', 'cookies', 'legal-notice', 'accessibility'];

function list(value: unknown, field: string, max: number): any[] {
  if (!Array.isArray(value)) throw new HttpError(400, `${field} must be a list.`);
  if (value.length > max) throw new HttpError(400, `${field} has too many entries.`);
  return value;
}

export function parseServices(value: unknown): ConsultationService[] {
  return list(value, 'Services', 30).map((s, i) => ({
    id: v.str(s?.id, `Service ${i + 1} id`, { max: 60 }) || `srv-${shortId()}`,
    title: v.str(s?.title, `Service ${i + 1} title`, { required: true, max: 160 }),
    duration: v.str(s?.duration, `Service ${i + 1} duration`, { max: 60 }),
    type: v.oneOf(s?.type, `Service ${i + 1} format`, SERVICE_TYPES),
    fee: v.str(s?.fee, `Service ${i + 1} fee`, { max: 120 }),
    description: v.str(s?.description, `Service ${i + 1} description`, { max: 2000 }),
    suitableFor: v.str(s?.suitableFor, `Service ${i + 1} "suitable for"`, { max: 500 }),
  }));
}

export function parsePosts(value: unknown): BlogPost[] {
  return list(value, 'Journal posts', 200).map((p, i) => {
    const label = `Article ${i + 1}`;
    const paragraphs = list(p?.content ?? [], `${label} body`, 60).map((t, j) =>
      v.str(t, `${label} paragraph ${j + 1}`, { max: 5000 })
    ).filter(Boolean);
    return {
      id: v.str(p?.id, `${label} id`, { max: 60 }) || `post-${shortId()}`,
      title: v.str(p?.title, `${label} title`, { required: true, max: 200 }),
      category: v.oneOf(p?.category, `${label} category`, POST_CATEGORIES),
      readTime: v.str(p?.readTime, `${label} read time`, { max: 40 }),
      date: v.str(p?.date, `${label} date`, { max: 40 }),
      excerpt: v.str(p?.excerpt, `${label} excerpt`, { max: 600 }),
      author: v.str(p?.author, `${label} author`, { max: 120 }),
      authorRole: v.str(p?.authorRole, `${label} author role`, { max: 160 }),
      image: v.url(p?.image, `${label} image URL`),
      content: paragraphs,
      status: p?.status === 'draft' ? 'draft' : 'published',
    };
  });
}

export function parsePolicies(value: unknown, current: ContentDoc['policies']): Record<string, PolicyContent> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new HttpError(400, 'Policies must be an object.');
  const out: Record<string, PolicyContent> = { ...current };
  for (const [key, p] of Object.entries(value as Record<string, any>)) {
    if (!POLICY_KEYS.includes(key)) throw new HttpError(400, `Unknown policy "${key}".`);
    out[key] = {
      title: v.str(p?.title, `${key} title`, { required: true, max: 160 }),
      subtitle: v.str(p?.subtitle, `${key} subtitle`, { max: 300 }),
      sections: list(p?.sections ?? [], `${key} sections`, 30).map((s, i) => ({
        heading: v.str(s?.heading, `${key} section ${i + 1} heading`, { max: 200 }),
        text: v.str(s?.text, `${key} section ${i + 1} text`, { max: 5000 }),
      })),
    };
  }
  return out;
}

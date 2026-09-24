import { NextRequest, NextResponse } from 'next/server';
import { db, GemstoneData } from '../../../../../backend/data/db';
import { requireAdmin } from '../../../../lib/requireAdmin';

const CATEGORIES = ['Diamond', 'Sapphire', 'Emerald', 'Ruby', 'Spinel', 'Tourmaline'];
const SHAPES = ['Emerald Cut', 'Cushion', 'Round Brilliant', 'Oval', 'Pear', 'Asscher'];
const STATUSES = ['In Vault', 'On Memo', 'Reserved'];

export interface ValidationResult {
  errors: string[];
  stone?: GemstoneData;
}

/**
 * Validates and normalises an incoming stone.
 *
 * The database enforces these too (enums, CHECK constraints); doing it here as
 * well turns a constraint violation into a message the desk can act on, and
 * keeps a bad row from ever being attempted.
 */
export function buildStone(body: any, id: string): ValidationResult {
  const errors: string[] = [];

  const name = String(body?.name ?? '').trim();
  const category = String(body?.category ?? '');
  const shape = String(body?.shape ?? '');
  const status = String(body?.status ?? 'In Vault');
  const carat = Number(body?.carat);
  const priceUSD = Number(body?.priceUSD);

  if (!name) errors.push('Name is required.');
  if (!CATEGORIES.includes(category)) errors.push(`Category must be one of: ${CATEGORIES.join(', ')}.`);
  if (!SHAPES.includes(shape)) errors.push(`Shape must be one of: ${SHAPES.join(', ')}.`);
  if (!STATUSES.includes(status)) errors.push(`Status must be one of: ${STATUSES.join(', ')}.`);
  if (!Number.isFinite(carat) || carat <= 0) errors.push('Carat must be a number greater than zero.');
  if (!Number.isFinite(priceUSD) || priceUSD < 0) errors.push('Price must be zero or more.');

  const certNumber = String(body?.certNumber ?? '').trim();
  if (!certNumber) errors.push('Certificate number is required.');

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    stone: {
      id,
      name,
      category: category as GemstoneData['category'],
      shape: shape as GemstoneData['shape'],
      carat,
      color: String(body.color ?? '').trim(),
      clarity: String(body.clarity ?? '').trim(),
      origin: String(body.origin ?? '').trim(),
      treatment: String(body.treatment ?? 'None (Untreated / Natural)').trim(),
      certification: String(body.certification ?? 'GIA').trim(),
      certNumber,
      priceUSD,
      // Derived rather than trusted, so the two prices can never disagree.
      pricePerCarat: Math.round(priceUSD / carat),
      dimensions: String(body.dimensions ?? '').trim(),
      image: String(body.image ?? '').trim(),
      featured: Boolean(body.featured),
      status: status as GemstoneData['status'],
      description: String(body.description ?? '').trim(),
    },
  };
}

/** Full inventory, including anything a public listing would filter out. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const stones = await db.getGemstones();
    return NextResponse.json({ success: true, count: stones.length, data: stones });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to load inventory.' },
      { status: 500 }
    );
  }
}

/** Add a stone to the vault. */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const body = await req.json();

    const slug = String(body?.category ?? 'gem').slice(0, 3).toLowerCase();
    const id = String(body?.id ?? '').trim() || `${slug}-${Date.now()}`;

    const { errors, stone } = buildStone(body, id);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(' ') }, { status: 400 });
    }

    const existing = await db.getGemstoneById(id);
    if (existing) {
      return NextResponse.json(
        { success: false, error: `A stone with id '${id}' already exists.` },
        { status: 409 }
      );
    }

    const created = await db.createGemstone(stone!);
    return NextResponse.json(
      { success: true, message: 'Stone added to vault inventory.', data: created },
      { status: 201 }
    );
  } catch (err: any) {
    // A duplicate certificate number trips the unique index rather than the
    // checks above, since it is only knowable at write time.
    if (err?.code === '23505') {
      return NextResponse.json(
        { success: false, error: 'That certificate number is already recorded against another stone.' },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { success: false, error: 'Failed to add stone.', details: err?.message },
      { status: 500 }
    );
  }
}

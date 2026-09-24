import { NextRequest, NextResponse } from 'next/server';
import { db, PolicyData } from '../../../../../backend/data/db';
import { requireAdmin } from '../../../../lib/requireAdmin';

/**
 * The slugs the front end can open as a PolicyType. A policy stored under any
 * other slug would never be reachable from the site, so new ones are rejected
 * rather than silently orphaned.
 */
const KNOWN_SLUGS = [
  'ethical-sourcing',
  'shipping-returns',
  'terms',
  'privacy',
  'cookies',
  'legal-notice',
  'accessibility',
];

function buildPolicy(body: any): { errors: string[]; policy?: PolicyData } {
  const errors: string[] = [];

  const slug = String(body?.slug ?? '').trim();
  const title = String(body?.title ?? '').trim();

  if (!title) errors.push('Title is required.');
  if (!KNOWN_SLUGS.includes(slug)) {
    errors.push(`Slug must be one of: ${KNOWN_SLUGS.join(', ')}.`);
  }

  const rawSections = Array.isArray(body?.sections) ? body.sections : [];
  const sections = rawSections
    .map((s: any, i: number) => ({
      heading: String(s?.heading ?? '').trim(),
      text: String(s?.text ?? '').trim(),
      sortOrder: i + 1,
    }))
    .filter((s: any) => s.heading || s.text);

  if (sections.length === 0) errors.push('A policy needs at least one section.');
  if (sections.some((s: any) => !s.heading)) errors.push('Every section needs a heading.');
  if (sections.some((s: any) => !s.text)) errors.push('Every section needs body text.');

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    policy: {
      // Slug is the identity: it is what the front end asks for.
      id: slug,
      slug,
      title,
      subtitle: String(body.subtitle ?? '').trim(),
      sortOrder: Number(body.sortOrder ?? 0),
      sections,
    },
  };
}

export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const policies = await db.getPolicies();
    return NextResponse.json({ success: true, count: policies.length, data: policies });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load policies.' }, { status: 500 });
  }
}

/** Create or replace a policy, including all of its sections. */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const body = await req.json();
    const { errors, policy } = buildPolicy(body);

    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(' ') }, { status: 400 });
    }

    const saved = await db.upsertPolicy(policy!);
    return NextResponse.json({ success: true, message: 'Policy saved.', data: saved });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to save policy.', details: err?.message },
      { status: 500 }
    );
  }
}

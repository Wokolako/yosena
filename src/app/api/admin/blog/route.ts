import { NextRequest, NextResponse } from 'next/server';
import { db, BlogPostData } from '../../../../../backend/data/db';
import { requireAdmin } from '../../../../lib/requireAdmin';

const CATEGORIES = ['Gemology', 'Market Intelligence', 'Ethical Sourcing', 'Atelier Craft'];

function buildPost(body: any, id: string): { errors: string[]; post?: BlogPostData } {
  const errors: string[] = [];

  const title = String(body?.title ?? '').trim();
  const category = String(body?.category ?? '');
  const author = String(body?.author ?? '').trim();

  if (!title) errors.push('Title is required.');
  if (!author) errors.push('Author is required.');
  if (!CATEGORIES.includes(category)) {
    errors.push(`Category must be one of: ${CATEGORIES.join(', ')}.`);
  }

  // The body arrives either as an array of paragraphs or as one blob of text
  // with blank lines between them, which is what a textarea produces.
  const raw = body?.content;
  const content = Array.isArray(raw)
    ? raw.map((p: unknown) => String(p).trim()).filter(Boolean)
    : String(raw ?? '')
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean);

  if (content.length === 0) errors.push('The article needs at least one paragraph.');

  if (errors.length > 0) return { errors };

  return {
    errors: [],
    post: {
      id,
      title,
      category: category as BlogPostData['category'],
      readTime: String(body.readTime ?? '').trim() || `${Math.max(1, Math.round(content.join(' ').split(/\s+/).length / 200))} min read`,
      date: String(body.date ?? '').trim() || new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }),
      excerpt: String(body.excerpt ?? '').trim() || content[0].slice(0, 180),
      author,
      authorRole: String(body.authorRole ?? '').trim(),
      image: String(body.image ?? '').trim(),
      content,
      sortOrder: Number(body.sortOrder ?? 0),
      isPublished: body.isPublished === undefined ? true : Boolean(body.isPublished),
    },
  };
}

/** Every article, drafts included. */
export async function GET() {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const posts = await db.getBlogPosts();
    return NextResponse.json({ success: true, count: posts.length, data: posts });
  } catch {
    return NextResponse.json({ success: false, error: 'Failed to load articles.' }, { status: 500 });
  }
}

/** Create or replace an article. Sending an existing id edits that article. */
export async function POST(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const body = await req.json();
    const id = String(body?.id ?? '').trim() || `post-${Date.now()}`;

    const { errors, post } = buildPost(body, id);
    if (errors.length > 0) {
      return NextResponse.json({ success: false, error: errors.join(' ') }, { status: 400 });
    }

    const saved = await db.upsertBlogPost(post!);
    return NextResponse.json(
      { success: true, message: 'Article saved.', data: saved },
      { status: 201 }
    );
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to save article.', details: err?.message },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const gate = await requireAdmin();
  if (gate.response) return gate.response;

  try {
    const id = new URL(req.url).searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'An article id is required.' },
        { status: 400 }
      );
    }

    const deleted = await db.deleteBlogPost(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: `Article '${id}' not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Article removed.' });
  } catch (err: any) {
    return NextResponse.json(
      { success: false, error: 'Failed to remove article.', details: err?.message },
      { status: 500 }
    );
  }
}

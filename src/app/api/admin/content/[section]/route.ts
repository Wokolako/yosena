import { NextRequest } from 'next/server';
import { db } from '@backend/store/db';
import { requireAdmin } from '@backend/auth/session';
import { parsePosts, parseServices, parsePolicies } from '@backend/lib/adminInput';
import { audit } from '@backend/lib/audit';
import { handle, ok, readJson, assertSameOrigin, HttpError } from '@backend/lib/http';

type Ctx = { params: Promise<{ section: string }> };

/** Replaces one content section. Changes are live on the next page load — no redeploy. */
export const PUT = handle(async (req: NextRequest, { params }: Ctx) => {
  assertSameOrigin(req);
  const admin = await requireAdmin();
  const { section } = await params;
  const body = await readJson(req, 1_000_000);

  const content = db.transaction((tx) => {
    const content = { ...tx.getDoc('content') };
    if (section === 'posts') content.posts = parsePosts(body.posts);
    else if (section === 'services') {
      const services = parseServices(body.services);
      if (services.length === 0) throw new HttpError(400, 'Keep at least one consultation service.');
      content.services = services;
    } else if (section === 'policies') content.policies = parsePolicies(body.policies, content.policies);
    else throw new HttpError(404, 'Unknown content section.');
    tx.setDoc('content', content);
    audit(tx, admin, `content.${section}`, section);
    return content;
  });

  return ok({ message: 'Published. The site shows the change now.', data: content });
});

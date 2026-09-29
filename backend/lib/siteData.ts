import { db } from '../store/db';
import { publicStones } from './commerce';
import { publicCheckoutConfig } from '../config';
import type { SiteData } from '../../src/types';

/** Everything the public site renders, read fresh from the data store on each request. */
export function loadSiteData(): SiteData {
  const content = db.doc('content');
  return {
    stones: publicStones(),
    services: content.services || [],
    posts: (content.posts || []).filter((p) => (p.status ?? 'published') === 'published'),
    policies: content.policies || {},
    checkout: publicCheckoutConfig(),
  };
}

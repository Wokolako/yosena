import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getSessionUser } from '@backend/auth/session';

export const metadata: Metadata = {
  title: 'Admin Console | YosenaMora',
  robots: { index: false, follow: false },
};

// Always evaluated per request: the role is checked on the server, never trusted from the browser.
export const dynamic = 'force-dynamic';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  // Anyone who is not a signed-in admin sees an ordinary 404 — the console does not advertise itself.
  if (!user || user.accountRole !== 'admin') notFound();
  return <>{children}</>;
}

import { getSessionUser } from '@backend/auth/session';
import { AdminConsole } from '../../admin/AdminConsole';

export default async function AdminPage() {
  // The layout has already refused non-admins; this only reads the name for the header.
  const user = await getSessionUser();
  return <AdminConsole adminName={user?.clientName ?? 'Admin'} adminEmail={user?.email ?? ''} />;
}

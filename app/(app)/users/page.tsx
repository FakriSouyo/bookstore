import { notFound } from 'next/navigation';

import { Panel } from '@/components/shared/Panel';
import { PageHeader } from '@/components/shared/PageHeader';
import { UsersManager } from '@/components/users/UsersManager';
import { getSessionUser, hasPermission } from '@/lib/auth/guards';
import { listUsers } from '@/lib/services/users';

export default async function UsersPage() {
  if (!(await hasPermission('users:manage'))) notFound();
  const session = await getSessionUser();
  const users = await listUsers();
  return (
    <div>
      <PageHeader title="Pengguna" subtitle="Akun staf dan peran (khusus OWNER)" />
      <Panel>
        <UsersManager users={users} currentUserId={session?.id ?? ''} />
      </Panel>
    </div>
  );
}

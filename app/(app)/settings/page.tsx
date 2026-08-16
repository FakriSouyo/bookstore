import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/shared/PageHeader';
import { SettingsForm } from '@/components/settings/SettingsForm';
import { hasPermission } from '@/lib/auth/guards';
import { getSettings } from '@/lib/services/settings';

export default async function SettingsPage() {
  if (!(await hasPermission('settings:manage'))) notFound();
  const settings = await getSettings();
  return (
    <div>
      <PageHeader title="Pengaturan" subtitle="Konfigurasi toko (khusus OWNER)" />
      <SettingsForm settings={settings} />
    </div>
  );
}

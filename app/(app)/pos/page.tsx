import { PosClient } from '@/components/pos/PosClient';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasPermission } from '@/lib/auth/guards';
import { notFound } from 'next/navigation';

export default async function PosPage() {
  if (!(await hasPermission('pos:operate'))) notFound();
  return (
    <div>
      <PageHeader title="Kasir" subtitle="Cari, tambahkan, dan bayar — cepat" />
      <PosClient />
    </div>
  );
}

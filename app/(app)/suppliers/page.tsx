import { notFound } from 'next/navigation';

import { CatalogManager } from '@/components/catalog/CatalogManager';
import { Panel } from '@/components/shared/Panel';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasPermission } from '@/lib/auth/guards';
import { listCatalog } from '@/lib/services/catalog';

export default async function SuppliersPage() {
  if (!(await hasPermission('suppliers:manage'))) notFound();
  const data = await listCatalog('suppliers');
  return (
    <div>
      <PageHeader title="Pemasok" subtitle="Tempat kamu membeli stok" />
      <Panel>
        <CatalogManager table="suppliers" initialData={data as never} />
      </Panel>
    </div>
  );
}

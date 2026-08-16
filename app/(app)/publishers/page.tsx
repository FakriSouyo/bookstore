import { notFound } from 'next/navigation';

import { CatalogManager } from '@/components/catalog/CatalogManager';
import { Panel } from '@/components/shared/Panel';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasPermission } from '@/lib/auth/guards';
import { listCatalog } from '@/lib/services/catalog';

export default async function PublishersPage() {
  if (!(await hasPermission('publishers:manage'))) notFound();
  const data = await listCatalog('publishers');
  return (
    <div>
      <PageHeader title="Penerbit" subtitle="Penerbit buku-buku kamu" />
      <Panel>
        <CatalogManager table="publishers" initialData={data as never} />
      </Panel>
    </div>
  );
}

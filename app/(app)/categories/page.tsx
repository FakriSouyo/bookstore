import { notFound } from 'next/navigation';

import { CatalogManager } from '@/components/catalog/CatalogManager';
import { Panel } from '@/components/shared/Panel';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasPermission } from '@/lib/auth/guards';
import { listCatalog } from '@/lib/services/catalog';

export default async function CategoriesPage() {
  if (!(await hasPermission('categories:manage'))) notFound();
  const data = await listCatalog('categories');
  return (
    <div>
      <PageHeader title="Kategori" subtitle="Atur katalog kamu" />
      <Panel>
        <CatalogManager table="categories" initialData={data as never} />
      </Panel>
    </div>
  );
}

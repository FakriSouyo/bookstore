import { notFound } from 'next/navigation';

import { BookForm } from '@/components/books/BookForm';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasPermission } from '@/lib/auth/guards';
import { listCatalog } from '@/lib/services/catalog';

export default async function NewBookPage() {
  if (!(await hasPermission('books:create'))) notFound();
  const [categories, publishers] = await Promise.all([listCatalog('categories', true), listCatalog('publishers')]);
  return (
    <div>
      <PageHeader title="Buku baru" subtitle="Buat entri katalog baru" breadcrumb={[{ title: 'Buku', href: '/books' }, { title: 'Baru' }]} />
      <BookForm
        mode="create"
        categories={categories.map((c) => ({ id: String(c.id), name: String(c.name) }))}
        publishers={publishers.map((p) => ({ id: String(p.id), name: String(p.name) }))}
      />
    </div>
  );
}

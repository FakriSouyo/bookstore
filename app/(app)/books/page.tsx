import { BooksClient } from '@/components/books/BooksClient';
import { hasPermission } from '@/lib/auth/guards';
import { listBooks } from '@/lib/services/books';
import { listCatalog } from '@/lib/services/catalog';
import type { BookStatus } from '@/types/database';

const PAGE_SIZE = 20;

export default async function BooksPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; search?: string; category_id?: string; publisher_id?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [canEdit, canDelete, canAdjust, { rows, total }, categories, publishers] = await Promise.all([
    hasPermission('books:update'),
    hasPermission('books:delete'),
    hasPermission('inventory:adjust'),
    listBooks({
      page,
      pageSize: PAGE_SIZE,
      search: sp.search,
      categoryId: sp.category_id,
      publisherId: sp.publisher_id,
      status: sp.status as BookStatus | undefined,
    }),
    listCatalog('categories'),
    listCatalog('publishers'),
  ]);

  return (
    <BooksClient
      rows={rows}
      total={total}
      page={page}
      canEdit={canEdit}
      canDelete={canDelete}
      canAdjust={canAdjust}
      categories={categories.map((c) => ({ id: String(c.id), name: String(c.name) }))}
      publishers={publishers.map((p) => ({ id: String(p.id), name: String(p.name) }))}
    />
  );
}

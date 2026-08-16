import { BookDetailClient, type BookDetailRow } from '@/components/books/BookDetailClient';
import { hasPermission } from '@/lib/auth/guards';
import { getBook } from '@/lib/services/books';
import { listCatalog } from '@/lib/services/catalog';

export default async function BookDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const canEdit = await hasPermission('books:update');

  const { book, images } = await getBook(id);
  const [categories, publishers] = await Promise.all([listCatalog('categories', true), listCatalog('publishers')]);

  return (
    <BookDetailClient
      id={id}
      tab={tab}
      book={book as BookDetailRow}
      images={images as never[]}
      categories={categories.map((c) => ({ id: String(c.id), name: String(c.name) }))}
      publishers={publishers.map((p) => ({ id: String(p.id), name: String(p.name) }))}
      canEdit={canEdit}
    />
  );
}

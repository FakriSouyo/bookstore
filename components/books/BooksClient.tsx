'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Suspense, useState } from 'react';

import { BookFilters } from '@/components/books/BookFilters';
import { BookForm } from '@/components/books/BookForm';
import { BookRowActions } from '@/components/books/BookRowActions';
import { AdjustStockButton } from '@/components/inventory/AdjustStockButton';
import { EmptyState } from '@/components/shared/EmptyState';
import { Money } from '@/components/shared/Money';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusTag } from '@/components/shared/StatusTag';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import type { BookListItem } from '@/lib/services/books';

export interface CatalogOption {
  id: string;
  name: string;
}

function Cover({ url }: { url?: string | null }) {
  return url ? (
    // Lazy: list covers below the fold are not fetched until scrolled near.
    // Explicit width/height keep layout stable (no CLS).
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={40} height={54} loading="lazy" decoding="async" className="object-cover" />
  ) : (
    <span className="text-muted-foreground">—</span>
  );
}

export function BooksClient({
  rows,
  total,
  page,
  canEdit,
  canDelete,
  canAdjust,
  categories,
  publishers,
}: {
  rows: BookListItem[];
  total: number;
  page: number;
  canEdit: boolean;
  canDelete: boolean;
  canAdjust: boolean;
  categories: CatalogOption[];
  publishers: CatalogOption[];
}) {
  const router = useRouter();
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  const openCreate = () => {
    setCreateKey((k) => k + 1);
    setCreateOpen(true);
  };

  const goToPage = (p: number) => {
    const sp = new URLSearchParams(window.location.search);
    sp.set('page', String(p));
    router.push(`/books?${sp.toString()}`);
  };

  const columns: DataColumn<BookListItem>[] = [
    {
      key: 'cover',
      header: 'Sampul',
      render: (row) => <Cover url={row.coverUrl} />,
    },
    {
      key: 'title',
      header: 'Judul',
      render: (row) => (
        <a href={`/books/${row.id}`} className="block max-w-[260px] truncate font-medium text-primary hover:underline">
          {row.title}
        </a>
      ),
    },
    { key: 'isbn', header: 'ISBN', priority: 'tablet', render: (row) => row.isbn ?? '—' },
    { key: 'category', header: 'Kategori', priority: 'tablet', render: (row) => row.category_name ?? '—' },
    { key: 'purchasePrice', header: 'Harga beli', priority: 'desktop', align: 'right', render: (row) => <Money cents={row.purchase_price_cents ?? 0} secondary /> },
    { key: 'sellingPrice', header: 'Harga jual', align: 'right', render: (row) => <Money cents={row.selling_price_cents ?? 0} strong /> },
    {
      key: 'stock',
      header: 'Stok',
      align: 'right',
      render: (row) => (
        <span className={cn('tabular-nums', row.stock <= (row.minimum_stock ?? 0) && 'text-destructive font-semibold')}>{row.stock}</span>
      ),
    },
    { key: 'status', header: 'Status', render: (row) => <StatusTag domain="book" value={row.status} /> },
    {
      key: 'actions',
      header: '',
      render: (row) => (
        <div className="flex items-center gap-1">
          {canAdjust && (
            <AdjustStockButton compact books={[{ id: row.id, title: row.title, stock: row.stock }]} defaultBookId={row.id} />
          )}
          <BookRowActions bookId={row.id} status={row.status} canEdit={canEdit} canDelete={canDelete} />
        </div>
      ),
    },
  ];

  const cardRender = (row: BookListItem) => (
    <div className="flex gap-3">
      {row.coverUrl ? <Cover url={row.coverUrl} /> : null}
      <div className="min-w-0 flex-1">
        <a href={`/books/${row.id}`} className="block truncate font-semibold text-primary hover:underline">
          {row.title}
        </a>
        <p className="m-0 text-xs text-muted-foreground">
          {row.isbn ?? 'tanpa ISBN'} · {row.category_name ?? 'tanpa kategori'}
        </p>
        <div className="mt-1.5 flex items-center justify-between">
          <Money cents={row.selling_price_cents} strong />
          <StatusTag domain="book" value={row.status} />
        </div>
        <p className={cn('m-0 mt-0.5 text-xs', row.stock <= (row.minimum_stock ?? 0) ? 'text-destructive' : 'text-muted-foreground')}>
          Stok: {row.stock}
        </p>
        {canAdjust && (
          <div className="mt-2 flex justify-end">
            <AdjustStockButton compact books={[{ id: row.id, title: row.title, stock: row.stock }]} defaultBookId={row.id} />
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader
        title="Buku"
        subtitle={`${total} buku dalam katalog`}
        actions={
          canEdit
            ? [
                <Button key="new" onClick={openCreate}>
                  <Plus className="size-4" />
                  Buku baru
                </Button>,
              ]
            : []
        }
      />
      <div className="border border-border bg-card p-4">
        <Suspense fallback={null}>
          <BookFilters options={{ categories, publishers }} />
        </Suspense>
        {rows.length === 0 ? (
          <EmptyState title="Tidak ada buku" description="Coba ubah filter atau tambahkan buku pertama." />
        ) : (
          <ResponsiveTable<BookListItem>
            rowKey="id"
            columns={columns}
            data={rows}
            cardRender={cardRender}
            pagination={{ current: page, pageSize: 20, total, onPageChange: goToPage }}
          />
        )}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[85vh] max-w-[680px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Buku baru</DialogTitle>
          </DialogHeader>
          <BookForm
            key={createKey}
            mode="create"
            embedded
            categories={categories}
            publishers={publishers}
            onDone={() => {
              setCreateOpen(false);
              router.refresh();
            }}
            onCancel={() => setCreateOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

'use client';

import { Pencil } from 'lucide-react';

import { BookForm } from '@/components/books/BookForm';
import type { CatalogOption } from '@/components/books/BooksClient';
import { AdjustStockButton } from '@/components/inventory/AdjustStockButton';
import { Money } from '@/components/shared/Money';
import { PageHeader } from '@/components/shared/PageHeader';
import { BookImageManager } from '@/components/upload/BookImageManager';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/format';
import type { BookStatus } from '@/types/database';

interface BookImageRow {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export interface BookDetailRow {
  id: string;
  title: string;
  author: string;
  isbn: string | null;
  barcode: string | null;
  description: string | null;
  category_id: string | null;
  publisher_id: string | null;
  publication_year: number | null;
  edition: string | null;
  language: string;
  purchase_price_cents: number;
  selling_price_cents: number;
  stock: number;
  minimum_stock: number;
  location: string | null;
  status: BookStatus;
  created_at: string;
  categories?: { name: string } | null;
  publishers?: { name: string } | null;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-border/60 py-1.5 last:border-0">
      <span className="shrink-0 text-[12px] text-muted-foreground">{label}</span>
      <span className="text-right text-[13px]">{children}</span>
    </div>
  );
}

export function BookDetailClient({
  book,
  images,
  categories,
  publishers,
  canEdit,
  tab,
  id,
}: {
  book: BookDetailRow;
  images: BookImageRow[];
  categories: CatalogOption[];
  publishers: CatalogOption[];
  canEdit: boolean;
  tab?: string;
  id: string;
}) {
  if (tab === 'edit') {
    return (
      <div>
        <PageHeader title="Ubah buku" breadcrumb={[{ title: 'Buku', href: '/books' }, { title: book.title }]} />
        <BookForm
          mode="edit"
          bookId={book.id}
          initialValues={{
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            barcode: book.barcode,
            description: book.description,
            category_id: book.category_id,
            publisher_id: book.publisher_id,
            publication_year: book.publication_year,
            edition: book.edition,
            language: book.language,
            purchase_price_cents: book.purchase_price_cents,
            selling_price_cents: book.selling_price_cents,
            minimum_stock: book.minimum_stock,
            location: book.location,
            status: book.status,
          }}
          categories={categories}
          publishers={publishers}
        />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title={book.title}
        breadcrumb={[{ title: 'Buku', href: '/books' }, { title: book.title }]}
        actions={
          canEdit
            ? [
                <Button key="edit" variant="outline" size="sm" asChild>
                  <a href={`/books/${id}?tab=edit`}>
                    <Pencil className="size-4" />
                    Ubah buku
                  </a>
                </Button>,
              ]
            : []
        }
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Detail</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Pengarang">{book.author || '—'}</Field>
            <Field label="ISBN">{book.isbn ?? '—'}</Field>
            <Field label="Barcode">{book.barcode ?? '—'}</Field>
            <Field label="Kategori">{book.categories?.name ?? '—'}</Field>
            <Field label="Penerbit">{book.publishers?.name ?? '—'}</Field>
            <Field label="Tahun / Edisi">
              {book.publication_year ?? '—'} · {book.edition ?? '—'}
            </Field>
            <Field label="Bahasa">{book.language}</Field>
            <Field label="Lokasi">{book.location ?? '—'}</Field>
            <Field label="Dibuat">{formatDateTime(book.created_at)}</Field>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Harga &amp; stok</CardTitle>
          </CardHeader>
          <CardContent>
            <Field label="Harga beli">
              <Money cents={book.purchase_price_cents} />
            </Field>
            <Field label="Harga jual">
              <Money cents={book.selling_price_cents} strong />
            </Field>
            <Field label="Stok">
              <span className={cn('tabular-nums', book.stock <= book.minimum_stock && 'font-semibold text-destructive')}>{book.stock}</span>
            </Field>
            <Field label="Stok minimum">
              <span className="tabular-nums">{book.minimum_stock}</span>
            </Field>
            <Field label="Status">
              <Badge variant={book.status === 'ACTIVE' ? 'success' : book.status === 'ARCHIVED' ? 'destructive' : 'muted'}>
                {book.status}
              </Badge>
            </Field>
            {canEdit && (
              <div className="mt-3">
                <AdjustStockButton books={[{ id: book.id, title: book.title, stock: book.stock }]} defaultBookId={book.id} />
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Sampul</CardTitle>
          </CardHeader>
          <CardContent>
            <BookImageManager bookId={book.id} images={images} canEdit={canEdit} />
          </CardContent>
        </Card>
      </div>
      <Card className="mt-4">
        <CardHeader>
          <CardTitle>Deskripsi</CardTitle>
        </CardHeader>
        <CardContent>
          {book.description ? <p className="m-0">{book.description}</p> : <p className="m-0 text-muted-foreground">Tidak ada deskripsi.</p>}
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { AdjustStockButton } from '@/components/inventory/AdjustStockButton';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusTag } from '@/components/shared/StatusTag';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { formatDateTime } from '@/lib/utils/format';

const PAGE_SIZE = 20;

export interface StockRow {
  id: string;
  title: string;
  isbn: string | null;
  stock: number;
  minimum_stock: number;
  status: string;
}

export interface MovementRow {
  id: string;
  created_at: string;
  movement_type: string;
  quantity: number;
  new_stock: number;
  notes: string | null;
  books?: { title: string } | null;
  profiles?: { full_name?: string } | null;
}

export function InventoryClient({
  books,
  movements,
  page,
  total,
  canAdjust,
}: {
  books: StockRow[];
  movements: MovementRow[];
  page: number;
  total: number;
  canAdjust: boolean;
}) {
  const stockColumns: DataColumn<StockRow>[] = [
    { key: 'title', header: 'Judul', render: (row) => <span className="block max-w-[260px] truncate">{row.title}</span> },
    { key: 'isbn', header: 'ISBN', priority: 'tablet', render: (row) => row.isbn ?? '—' },
    {
      key: 'stock',
      header: 'Stok',
      align: 'right',
      render: (row) => (
        <span
          className={cn(
            'tabular-nums',
            row.stock <= row.minimum_stock && 'text-destructive font-semibold',
            row.stock > row.minimum_stock && row.stock <= row.minimum_stock * 1.5 && 'text-warning',
          )}
        >
          {row.stock}
        </span>
      ),
    },
    { key: 'min', header: 'Min', priority: 'tablet', align: 'right', render: (row) => row.minimum_stock },
    { key: 'status', header: 'Status', render: (row) => <StatusTag domain="book" value={row.status} /> },
    ...(canAdjust
      ? [
          {
            key: 'actions',
            header: '',
            render: (row) => <AdjustStockButton compact books={[{ id: row.id, title: row.title, stock: row.stock }]} defaultBookId={row.id} />,
          } as DataColumn<StockRow>,
        ]
      : []),
  ];

  const movementColumns: DataColumn<MovementRow>[] = [
    { key: 'date', header: 'Tanggal', render: (row) => formatDateTime(row.created_at) },
    { key: 'book', header: 'Buku', render: (row) => row.books?.title ?? '—' },
    { key: 'type', header: 'Jenis', render: (row) => <span>{row.movement_type.replace(/_/g, ' ')}</span> },
    {
      key: 'qty',
      header: 'Jml',
      align: 'right',
      render: (row) => (
        <span className={cn('tabular-nums font-semibold', row.quantity > 0 ? 'text-success' : 'text-destructive')}>
          {row.quantity > 0 ? `+${row.quantity}` : row.quantity}
        </span>
      ),
    },
    { key: 'stock', header: 'Stok', priority: 'tablet', align: 'right', render: (row) => <span className="tabular-nums">{row.new_stock}</span> },
    { key: 'notes', header: 'Catatan', priority: 'desktop', render: (row) => <span className="block max-w-[220px] truncate">{row.notes ?? '—'}</span> },
    { key: 'by', header: 'Oleh', priority: 'desktop', render: (row) => row.profiles?.full_name ?? '—' },
  ];

  return (
    <div>
      <PageHeader
        title="Stok"
        subtitle="Stok saat ini dan buku besar pergerakan"
        actions={
          canAdjust
            ? [
                <AdjustStockButton
                  key="adjust"
                  books={books.map((b) => ({ id: b.id, title: b.title, stock: b.stock }))}
                />,
              ]
            : []
        }
      />
      <div className="border border-border bg-card p-4">
        <Tabs defaultValue="stock">
          <TabsList>
            <TabsTrigger value="stock">Stok ({books.length})</TabsTrigger>
            <TabsTrigger value="movements">Pergerakan</TabsTrigger>
          </TabsList>
          <TabsContent value="stock" className="pt-2">
            <ResponsiveTable<StockRow>
              rowKey="id"
              columns={stockColumns}
              data={books}
              cardRender={(row) => (
                <div>
                  <p className="m-0 font-semibold">{row.title}</p>
                  <div className="mt-1.5 flex items-center justify-between text-[13px]">
                    <span>
                      Stok: <b className="tabular-nums">{row.stock}</b>
                    </span>
                    <span className="text-muted-foreground">Min: {row.minimum_stock}</span>
                  </div>
                  {canAdjust && (
                    <div className="mt-2 flex justify-end">
                      <AdjustStockButton compact books={[{ id: row.id, title: row.title, stock: row.stock }]} defaultBookId={row.id} />
                    </div>
                  )}
                </div>
              )}
            />
          </TabsContent>
          <TabsContent value="movements" className="pt-2">
            <ResponsiveTable<MovementRow>
              rowKey="id"
              columns={movementColumns}
              data={movements}
              pagination={{ current: page, pageSize: PAGE_SIZE, total }}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

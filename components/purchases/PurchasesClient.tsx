'use client';

import { Plus } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { PurchaseForm, type PurchaseBookOption } from '@/components/purchases/PurchaseForm';
import { EmptyState } from '@/components/shared/EmptyState';
import { Money } from '@/components/shared/Money';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusTag } from '@/components/shared/StatusTag';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDate } from '@/lib/utils/format';

const PAGE_SIZE = 20;

export interface PurchaseListRow {
  id: string;
  invoice_number: string;
  total_cents: number;
  status: string;
  payment_status: string;
  purchase_date: string;
  suppliers?: { name?: string } | null;
}

const PURCHASE_STATUSES = ['DRAFT', 'ORDERED', 'RECEIVED', 'COMPLETED', 'CANCELLED'];

export function PurchasesClient({
  rows,
  total,
  page,
  canCreate,
  initialStatus,
  suppliers,
  books,
}: {
  rows: PurchaseListRow[];
  total: number;
  page: number;
  canCreate: boolean;
  initialStatus?: string;
  suppliers: Array<{ id: string; name: string }>;
  books: PurchaseBookOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [createOpen, setCreateOpen] = useState(false);
  const [createKey, setCreateKey] = useState(0);

  const updateParams = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  };

  const columns: DataColumn<PurchaseListRow>[] = [
    {
      key: 'invoice',
      header: 'Faktur',
      render: (row) => (
        <a href={`/purchases/${row.id}`} className="font-medium text-primary hover:underline">
          {row.invoice_number}
        </a>
      ),
    },
    { key: 'supplier', header: 'Pemasok', render: (row) => row.suppliers?.name ?? '—' },
    { key: 'date', header: 'Tanggal', priority: 'tablet', render: (row) => formatDate(row.purchase_date) },
    { key: 'status', header: 'Status', render: (row) => <StatusTag domain="purchase" value={row.status} /> },
    { key: 'total', header: 'Total', align: 'right', render: (row) => <Money cents={row.total_cents} strong /> },
    { key: 'payment', header: 'Pembayaran', priority: 'desktop', render: (row) => <StatusTag domain="payment" value={row.payment_status} /> },
    {
      key: 'view',
      header: '',
      render: (row) => (
        <Button variant="link" size="sm" className="h-7 px-1.5" asChild>
          <a href={`/purchases/${row.id}`}>Lihat</a>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Pembelian"
        subtitle={`${total} pesanan pembelian`}
        actions={
          canCreate
            ? [
                <Button
                  key="new"
                  onClick={() => {
                    setCreateKey((k) => k + 1);
                    setCreateOpen(true);
                  }}
                >
                  <Plus className="size-4" />
                  Pembelian baru
                </Button>,
              ]
            : []
        }
      />
      <div className="border border-border bg-card p-4">
        <div className="mb-4">
          <Select
            value={initialStatus ?? ''}
            onValueChange={(v) => updateParams((p) => (v ? p.set('status', v) : p.delete('status'), p.delete('page')))}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter berdasarkan status" />
            </SelectTrigger>
            <SelectContent>
              {PURCHASE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada pembelian" description="Buat pesanan pembelian untuk mulai membeli stok." />
        ) : (
          <ResponsiveTable<PurchaseListRow>
            rowKey="id"
            columns={columns}
            data={rows}
            pagination={{
              current: page,
              pageSize: PAGE_SIZE,
              total,
              onPageChange: (p) => updateParams((params) => params.set('page', String(p))),
            }}
            cardRender={(row) => (
              <div>
                <a href={`/purchases/${row.id}`} className="font-semibold text-primary hover:underline">
                  {row.invoice_number}
                </a>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{row.suppliers?.name ?? '—'}</span>
                  <Money cents={row.total_cents} strong />
                </div>
                <div className="mt-1">
                  <StatusTag domain="purchase" value={row.status} />
                </div>
              </div>
            )}
          />
        )}
      </div>
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-[760px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Pembelian baru</DialogTitle>
          </DialogHeader>
          <PurchaseForm
            key={createKey}
            embedded
            suppliers={suppliers}
            books={books}
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

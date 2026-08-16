'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { EmptyState } from '@/components/shared/EmptyState';
import { Money } from '@/components/shared/Money';
import { PageHeader } from '@/components/shared/PageHeader';
import { StatusTag } from '@/components/shared/StatusTag';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils/format';
import type { SaleStatus } from '@/types/database';

const PAGE_SIZE = 20;
const SALE_STATUSES: SaleStatus[] = ['COMPLETED', 'VOIDED', 'REFUNDED', 'PARTIALLY_REFUNDED'];

export interface SaleListRow {
  id: string;
  invoice_number: string;
  created_at: string;
  status: SaleStatus;
  total_cents: number;
  payment_method: string;
  profiles?: { full_name: string } | null;
}

export function SalesClient({
  rows,
  total,
  page,
  initialStatus,
}: {
  rows: SaleListRow[];
  total: number;
  page: number;
  initialStatus?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateParams = (mutate: (p: URLSearchParams) => void) => {
    const params = new URLSearchParams(searchParams.toString());
    mutate(params);
    router.push(`${pathname}?${params.toString()}`);
  };

  const columns: DataColumn<SaleListRow>[] = [
    {
      key: 'invoice',
      header: 'Faktur',
      render: (row) => (
        <a href={`/sales/${row.id}`} className="font-medium text-primary hover:underline">
          {row.invoice_number}
        </a>
      ),
    },
    { key: 'date', header: 'Tanggal', render: (row) => formatDateTime(row.created_at) },
    { key: 'cashier', header: 'Kasir', priority: 'tablet', render: (row) => row.profiles?.full_name ?? '—' },
    { key: 'total', header: 'Total', align: 'right', render: (row) => <Money cents={row.total_cents} strong /> },
    { key: 'payment', header: 'Pembayaran', priority: 'tablet', render: (row) => row.payment_method },
    { key: 'status', header: 'Status', render: (row) => <StatusTag domain="sale" value={row.status} /> },
    {
      key: 'view',
      header: '',
      render: (row) => (
        <Button variant="link" size="sm" className="h-7 px-1.5" asChild>
          <a href={`/sales/${row.id}`}>Lihat</a>
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Penjualan" subtitle={`${total} transaksi`} />
      <div className="border border-border bg-card p-4">
        <div className="mb-4">
          <Select value={initialStatus ?? ''} onValueChange={(v) => updateParams((p) => (v ? p.set('status', v) : p.delete('status'), p.delete('page')))}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter berdasarkan status" />
            </SelectTrigger>
            <SelectContent>
              {SALE_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {rows.length === 0 ? (
          <EmptyState title="Belum ada penjualan" description="Penjualan akan muncul setelah POS memproses transaksi." />
        ) : (
          <ResponsiveTable<SaleListRow>
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
                <a href={`/sales/${row.id}`} className="font-semibold text-primary hover:underline">
                  {row.invoice_number}
                </a>
                <div className="mt-1.5 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">{formatDateTime(row.created_at)}</span>
                  <Money cents={row.total_cents} strong />
                </div>
                <div className="mt-1">
                  <StatusTag domain="sale" value={row.status} />
                </div>
              </div>
            )}
          />
        )}
      </div>
    </div>
  );
}

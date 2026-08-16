'use client';

import { ChevronDown, Download } from 'lucide-react';
import { Suspense } from 'react';

import { ReportDateFilter } from '@/components/reports/ReportDateFilter';
import { EmptyState } from '@/components/shared/EmptyState';
import { PageHeader } from '@/components/shared/PageHeader';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ReportResult } from '@/lib/reports';

export function ReportPageClient({
  result,
  keyName,
  queryString,
}: {
  result: ReportResult;
  keyName: string;
  queryString: string;
}) {
  const exportHref = (format: string) =>
    `/api/reports/${keyName}/export?format=${format}${queryString ? `&${queryString}` : ''}`;

  const columns: DataColumn<Record<string, unknown>>[] = result.columns.map((c) => ({
    key: c,
    header: result.columnLabels?.[c] ?? c.replace(/_/g, ' '),
    align: result.moneyColumns.includes(c) ? 'right' : 'left',
    render: (row) => (
      <span className={result.moneyColumns.includes(c) ? 'tabular-nums' : undefined}>
        {String(row[c] ?? '—')}
      </span>
    ),
  }));

  return (
    <div>
      <PageHeader
        title={result.title}
        breadcrumb={[{ title: 'Laporan', href: '/reports' }, { title: result.title }]}
        actions={[
          <Suspense key="filter" fallback={null}>
            <ReportDateFilter />
          </Suspense>,
          <DropdownMenu key="export">
            <DropdownMenuTrigger asChild>
              <Button>
                <Download className="size-4" />
                Ekspor
                <ChevronDown className="size-3.5 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem asChild>
                <a href={exportHref('csv')}>Ekspor CSV</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={exportHref('xlsx')}>Ekspor Excel (XLSX)</a>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <a href={exportHref('pdf')}>Ekspor PDF</a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>,
        ]}
      />
      <div className="border border-border bg-card p-4">
        {result.rows.length === 0 ? (
          <EmptyState title="Tidak ada data untuk periode ini" description="Coba rentang tanggal yang lebih luas." />
        ) : (
          <div className="flex flex-col gap-2">
            <ResponsiveTable<Record<string, unknown>>
              rowKey="__idx"
              columns={columns}
              data={result.rows.map((r, i) => ({ ...r, __idx: String(i) }))}
              pagination={{ current: 1, pageSize: 20, total: result.rows.length }}
            />
            <p className="m-0 text-xs text-muted-foreground">
              {result.rows.length} baris · diagregasi di server
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

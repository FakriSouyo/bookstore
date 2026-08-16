'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';

import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { formatDateTime } from '@/lib/utils/format';

export interface AuditLogRow {
  id: string;
  created_at: string;
  action: string;
  entity_type: string | null;
  entity_id?: string | null;
  metadata?: Record<string, unknown> | string | null;
  profiles?: { full_name?: string } | null;
}

export function AuditLogsClient({
  rows,
  page,
  total,
  pageSize,
}: {
  rows: AuditLogRow[];
  page: number;
  total: number;
  pageSize: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const columns: DataColumn<AuditLogRow>[] = [
    { key: 'time', header: 'Waktu', render: (row) => formatDateTime(row.created_at) },
    { key: 'user', header: 'Pengguna', render: (row) => row.profiles?.full_name ?? '—' },
    { key: 'action', header: 'Aksi', render: (row) => <code className="text-[12px]">{row.action}</code> },
    {
      key: 'entity',
      header: 'Entitas',
      render: (row) => (row.entity_type ? `${row.entity_type} ${row.entity_id ? `(${row.entity_id.slice(0, 8)}…)` : ''}` : '—'),
    },
    {
      key: 'metadata',
      header: 'Metadata',
      render: (row) => (
        <span className="block max-w-[280px] truncate text-xs text-muted-foreground">
          {typeof row.metadata === 'string' ? row.metadata : row.metadata ? JSON.stringify(row.metadata).slice(0, 120) : '—'}
        </span>
      ),
    },
  ];

  return (
    <ResponsiveTable<AuditLogRow>
      rowKey="id"
      columns={columns}
      data={rows}
      pagination={{
        current: page,
        pageSize,
        total,
        onPageChange: (p) => {
          const params = new URLSearchParams(searchParams.toString());
          params.set('page', String(p));
          router.push(`${pathname}?${params.toString()}`);
        },
      }}
    />
  );
}

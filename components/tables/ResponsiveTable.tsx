'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useBreakpoint } from '@/components/layout/useBreakpoint';
import { cn } from '@/lib/utils';

export interface DataColumn<T> {
  key: string;
  header: React.ReactNode;
  /** Renders a cell from the row (antd dataIndex+render pattern replaced by this). */
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  /** Breakpoint visibility (bookstore-responsive). */
  priority?: 'always' | 'tablet' | 'desktop';
  className?: string;
}

interface PaginationState {
  current: number;
  pageSize: number;
  total: number;
  onPageChange?: (page: number) => void;
}

interface ResponsiveTableProps<T extends object> {
  columns: DataColumn<T>[];
  data: T[];
  rowKey: keyof T & string;
  loading?: boolean;
  /** Renders each row as a card on mobile (bookstore-responsive). */
  cardRender?: (row: T) => React.ReactNode;
  pagination?: PaginationState;
  onRowClick?: (row: T) => void;
  empty?: React.ReactNode;
}

export function ResponsiveTable<T extends object>({
  columns,
  data,
  rowKey,
  loading,
  cardRender,
  pagination,
  onRowClick,
  empty,
}: ResponsiveTableProps<T>) {
  const { isMobile, isDesktop } = useBreakpoint();

  if (loading) {
    return (
      <div className="space-y-3 py-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 flex-1" />
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-8 w-16" />
          </div>
        ))}
      </div>
    );
  }

  const keyOf = (row: T): string => String((row as Record<string, unknown>)[rowKey]);

  if (isMobile && cardRender) {
    return (
      <div>
        {data.length === 0 && empty}
        <div className="space-y-3">
          {data.map((row) => (
            <div
              key={keyOf(row)}
              className="border border-border bg-card p-3"
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {cardRender(row)}
            </div>
          ))}
        </div>
        {pagination && renderPagination(pagination)}
      </div>
    );
  }

  const visible = columns.filter((c) => {
    if (!c.priority || c.priority === 'always') return true;
    if (c.priority === 'tablet') return !isMobile;
    if (c.priority === 'desktop') return isDesktop;
    return true;
  });

  return (
    <div>
      <Table>
        <TableHeader className="bg-muted/50">
          <TableRow className="hover:bg-transparent">
            {visible.map((c) => (
              <TableHead key={c.key} className={cn(c.align === 'right' && 'text-right', c.align === 'center' && 'text-center')}>
                {c.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={visible.length} className="h-24 text-center text-muted-foreground">
                {empty ?? 'Tidak ada data.'}
              </TableCell>
            </TableRow>
          ) : (
            data.map((row) => (
              <TableRow
                key={keyOf(row)}
                className={cn(onRowClick && 'cursor-pointer')}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
              >
                {visible.map((c) => (
                  <TableCell key={c.key} className={cn(c.align === 'right' && 'text-right', c.align === 'center' && 'text-center', c.className)}>
                    {c.render ? c.render(row) : String((row as Record<string, unknown>)[c.key] ?? '—')}
                  </TableCell>
                ))}
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
      {pagination && renderPagination(pagination)}
    </div>
  );
}

function renderPagination(p: PaginationState) {
  const { current, pageSize, total, onPageChange } = p;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  return (
    <div className="mt-3 flex items-center justify-between gap-2">
      <span className="text-xs text-muted-foreground">
        {total} data · hal {current}/{pages}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon-sm"
          disabled={current <= 1}
          onClick={() => onPageChange?.(current - 1)}
          aria-label="Halaman sebelumnya"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon-sm"
          disabled={current >= pages}
          onClick={() => onPageChange?.(current + 1)}
          aria-label="Halaman berikutnya"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

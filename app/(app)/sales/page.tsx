import { SalesClient, type SaleListRow } from '@/components/sales/SalesClient';
import { listSales } from '@/lib/services/sales';
import type { SaleStatus } from '@/types/database';

const PAGE_SIZE = 20;

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const { rows, total } = await listSales({
    page,
    pageSize: PAGE_SIZE,
    status: sp.status as SaleStatus | undefined,
  });

  return <SalesClient rows={rows as SaleListRow[]} total={total} page={page} initialStatus={sp.status} />;
}

import { InventoryClient, type MovementRow, type StockRow } from '@/components/inventory/InventoryClient';
import { hasPermission } from '@/lib/auth/guards';
import { listMovements } from '@/lib/inventory/queries';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PAGE_SIZE = 20;

export default async function InventoryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const [canAdjust, { data: books }, { rows: movements, total }] = await Promise.all([
    hasPermission('inventory:adjust'),
    createSupabaseServerClient().then((supabase) =>
      supabase
        .from('books')
        .select('id,title,isbn,stock,minimum_stock,selling_price_cents,status')
        .eq('status', 'ACTIVE')
        .order('title', { ascending: true })
        .limit(500)
    ),
    listMovements({ page, pageSize: PAGE_SIZE }),
  ]);

  return (
    <InventoryClient
      books={(books ?? []) as StockRow[]}
      movements={movements as MovementRow[]}
      page={page}
      total={total}
      canAdjust={canAdjust}
    />
  );
}

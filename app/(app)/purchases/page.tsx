import { PurchasesClient, type PurchaseListRow } from '@/components/purchases/PurchasesClient';
import { hasPermission } from '@/lib/auth/guards';
import { listCatalog } from '@/lib/services/catalog';
import { listPurchases } from '@/lib/services/purchases';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PAGE_SIZE = 20;

export default async function PurchasesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);
  const canCreate = await hasPermission('purchases:create');

  const [purchases, suppliers, { data: books }] = await Promise.all([
    listPurchases({
      page,
      pageSize: PAGE_SIZE,
      status: sp.status as 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED' | undefined,
    }),
    canCreate ? listCatalog('suppliers', true) : Promise.resolve([]),
    canCreate
      ? createSupabaseServerClient().then((supabase) => supabase.from('books').select('id,title,isbn').eq('status', 'ACTIVE').order('title').limit(500))
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <PurchasesClient
      rows={purchases.rows as PurchaseListRow[]}
      total={purchases.total}
      page={page}
      canCreate={canCreate}
      initialStatus={sp.status}
      suppliers={suppliers.map((s) => ({ id: String(s.id), name: String(s.name) }))}
      books={(books ?? []).map((b) => ({ id: b.id, title: b.title, isbn: b.isbn }))}
    />
  );
}

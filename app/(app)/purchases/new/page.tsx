import { notFound } from 'next/navigation';

import { PageHeader } from '@/components/shared/PageHeader';
import { PurchaseForm } from '@/components/purchases/PurchaseForm';
import { hasPermission } from '@/lib/auth/guards';
import { listCatalog } from '@/lib/services/catalog';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export default async function NewPurchasePage() {
  if (!(await hasPermission('purchases:create'))) notFound();

  const supabase = await createSupabaseServerClient();
  const [suppliers, { data: books }] = await Promise.all([
    listCatalog('suppliers', true),
    supabase.from('books').select('id,title,isbn').eq('status', 'ACTIVE').order('title').limit(500),
  ]);

  return (
    <div>
      <PageHeader title="Pembelian baru" subtitle="Stok bertambah hanya saat barang diterima" breadcrumb={[{ title: 'Pembelian', href: '/purchases' }, { title: 'Baru' }]} />
      <PurchaseForm
        suppliers={suppliers.map((s) => ({ id: String(s.id), name: String(s.name) }))}
        books={(books ?? []).map((b) => ({ id: b.id, title: b.title, isbn: b.isbn }))}
      />
    </div>
  );
}

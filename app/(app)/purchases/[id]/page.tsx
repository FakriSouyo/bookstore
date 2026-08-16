import { PurchaseDetailClient, type PurchaseDetailRow } from '@/components/purchases/PurchaseDetailClient';
import { hasPermission } from '@/lib/auth/guards';
import { getPurchase } from '@/lib/services/purchases';

export default async function PurchaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const canReceive = await hasPermission('purchases:receive');
  const { purchase, items } = await getPurchase(id);

  return (
    <PurchaseDetailClient
      purchase={purchase as PurchaseDetailRow}
      items={items as Array<Record<string, unknown>>}
      canReceive={canReceive}
    />
  );
}

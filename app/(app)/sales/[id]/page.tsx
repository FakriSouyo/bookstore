import { SaleDetailClient, type SaleDetailRow } from '@/components/sales/SaleDetailClient';
import { hasPermission } from '@/lib/auth/guards';
import { getSale } from '@/lib/services/sales';

export default async function SaleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const canVoid = await hasPermission('sales:void');
  const canRefund = await hasPermission('sales:refund');
  const canPrint = await hasPermission('receipt:print');

  const { sale, items, payments, movements } = await getSale(id);

  return (
    <SaleDetailClient
      sale={sale as SaleDetailRow}
      items={items as Array<Record<string, unknown>>}
      payments={payments as Array<Record<string, unknown>>}
      movements={movements as never[]}
      canVoid={canVoid}
      canRefund={canRefund}
      canPrint={canPrint}
    />
  );
}

/**
 * Receipt data builder (skills/bookstore-receipt/SKILL.md).
 * Built from stored snapshots only — reprints always match the original.
 */

import { getSettings } from '@/lib/services/settings';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError } from '@/lib/utils/errors';
import type { ReceiptData } from './types';

export async function buildReceiptData(saleId: string): Promise<ReceiptData> {
  const supabase = await createSupabaseServerClient();
  const { data: sale, error } = await supabase
    .from('sales')
    .select('*,cashier:profiles!sales_cashier_id_fkey(full_name)')
    .eq('id', saleId)
    .single();
  if (error || !sale) throw new AppError('NOT_FOUND', 'Sale not found.');

  const { data: items } = await supabase
    .from('sale_items')
    .select('title_snapshot,quantity,unit_price_cents,line_total_cents')
    .eq('sale_id', saleId)
    .order('created_at', { ascending: true });

  const settings = await getSettings();

  return {
    store: {
      name: settings.store_name,
      address: settings.store_address,
      phone: settings.store_phone,
      footer: settings.receipt_footer,
      width: settings.receipt_width,
    },
    sale: {
      id: sale.id,
      invoiceNumber: sale.invoice_number,
      createdAt: sale.created_at,
      cashier: (sale.cashier as unknown as { full_name?: string } | null)?.full_name ?? '',
      status: sale.status,
      voidReason: sale.void_reason,
      refundedAmountCents: sale.refunded_amount_cents,
    },
    items: (items ?? []).map((i) => ({
      title: i.title_snapshot,
      quantity: i.quantity,
      unitPriceCents: i.unit_price_cents,
      lineTotalCents: i.line_total_cents,
    })),
    totals: {
      subtotalCents: sale.subtotal_cents,
      discountCents: sale.discount_cents,
      totalCents: sale.total_cents,
    },
    payment: {
      method: sale.payment_method,
      tenderedCents: sale.tendered_cents,
      changeCents: sale.change_cents,
    },
  };
}

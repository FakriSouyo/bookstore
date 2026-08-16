'use server';

import { refundSale, voidSale } from '@/lib/services/sales';

export async function voidSaleAction(saleId: string, reason: string) {
  return voidSale(saleId, reason);
}

export async function refundSaleAction(input: {
  sale_id: string;
  items: Array<{ book_id: string; quantity: number }>;
  amount_cents: number;
  reason: string;
}) {
  return refundSale(input);
}

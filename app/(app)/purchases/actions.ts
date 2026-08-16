'use server';

import {
  createPurchase,
  receivePurchase,
  updatePurchaseStatus,
} from '@/lib/services/purchases';
import type { PaymentStatus, PurchaseStatus } from '@/types/database';

export async function createPurchaseAction(input: {
  supplier_id: string;
  invoice_number: string;
  purchase_date: string;
  items: Array<{ book_id: string; quantity: number; unit_cost_cents: number; discount_cents?: number }>;
  discount_cents?: number;
  shipping_cents?: number;
  tax_cents?: number;
  notes?: string | null;
}) {
  return createPurchase(input);
}

export async function updatePurchaseStatusAction(
  id: string,
  status: PurchaseStatus,
  opts?: { notes?: string; payment_status?: PaymentStatus },
) {
  return updatePurchaseStatus(id, status, opts);
}

export async function receivePurchaseAction(id: string) {
  return receivePurchase(id);
}

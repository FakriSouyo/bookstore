/**
 * Purchases service (skills/bookstore-purchases/SKILL.md).
 * Stock increases ONLY on receiving (receive_purchase RPC).
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError, mapDbError, mapRpcError } from '@/lib/utils/errors';
import type { PaymentStatus, PurchaseRow, PurchaseStatus } from '@/types/database';

export const purchaseItemSchema = z.object({
  book_id: z.string().uuid(),
  quantity: z.number().int().min(1),
  unit_cost_cents: z.number().int().min(0),
  discount_cents: z.number().int().min(0).default(0),
});

export const purchaseCreateSchema = z.object({
  supplier_id: z.string().uuid(),
  invoice_number: z.string().trim().min(1, 'Invoice number is required'),
  purchase_date: z.string(),
  items: z.array(purchaseItemSchema).min(1, 'Add at least one item'),
  discount_cents: z.number().int().min(0).default(0),
  shipping_cents: z.number().int().min(0).default(0),
  tax_cents: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export interface PurchaseListParams {
  page: number;
  pageSize: number;
  status?: PurchaseStatus;
  supplierId?: string;
  search?: string;
  from?: string;
  to?: string;
}

export async function listPurchases(params: PurchaseListParams) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('purchases')
    .select('*,suppliers(name)', { count: 'exact' });
  if (params.status) query = query.eq('status', params.status);
  if (params.supplierId) query = query.eq('supplier_id', params.supplierId);
  if (params.from) query = query.gte('purchase_date', params.from);
  if (params.to) query = query.lte('purchase_date', params.to);
  if (params.search) query = query.or(`invoice_number.ilike.%${params.search}%`);

  const from = (params.page - 1) * params.pageSize;
  query = query.order('created_at', { ascending: false }).range(from, from + params.pageSize - 1);
  const { data, count, error } = await query;
  if (error) throw mapDbError(error);
  return {
    rows: (data ?? []) as Array<PurchaseRow & { suppliers?: { name: string } | null }>,
    total: count ?? 0,
  };
}

export async function getPurchase(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data: purchase, error } = await supabase
    .from('purchases')
    .select('*,suppliers(name),profiles(full_name)')
    .eq('id', id)
    .single();
  if (error || !purchase) throw new AppError('NOT_FOUND', 'Purchase not found.');

  const { data: items } = await supabase
    .from('purchase_items')
    .select('*,books(title,isbn)')
    .eq('purchase_id', id);
  return { purchase, items: items ?? [] };
}

export async function createPurchase(input: z.input<typeof purchaseCreateSchema>): Promise<{ id: string }> {
  await requireRole('purchases:create');
  const parsed = purchaseCreateSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_purchase', {
    p_supplier_id: parsed.supplier_id,
    p_invoice_number: parsed.invoice_number,
    p_purchase_date: parsed.purchase_date,
    p_items: parsed.items,
    p_discount_cents: parsed.discount_cents,
    p_shipping_cents: parsed.shipping_cents,
    p_tax_cents: parsed.tax_cents,
    p_notes: parsed.notes ?? null,
  });
  if (error) throw mapRpcError(error);
  await logAudit('purchases.create', { type: 'purchase', id: data }, { invoice_number: parsed.invoice_number });
  revalidatePath('/purchases');
  return { id: data };
}

const TRANSITIONS: Partial<Record<PurchaseStatus, PurchaseStatus[]>> = {
  DRAFT: ['ORDERED', 'CANCELLED'],
  ORDERED: ['CANCELLED'],
  RECEIVED: ['COMPLETED'],
};

export async function updatePurchaseStatus(
  id: string,
  next: PurchaseStatus,
  opts?: { notes?: string; payment_status?: PaymentStatus },
): Promise<void> {
  await requireRole('purchases:update');
  const supabase = await createSupabaseServerClient();
  const { data: current, error: getErr } = await supabase
    .from('purchases')
    .select('status,id')
    .eq('id', id)
    .single();
  if (getErr || !current) throw new AppError('NOT_FOUND', 'Purchase not found.');

  const allowed = TRANSITIONS[current.status as PurchaseStatus] ?? [];
  if (!allowed.includes(next)) {
    throw new AppError('BUSINESS_RULE', `Cannot move a ${current.status} purchase to ${next}.`);
  }
  if (next === 'CANCELLED') {
    const { data: received } = await supabase
      .from('purchase_items')
      .select('id')
      .eq('purchase_id', id)
      .gt('quantity_received', 0)
      .limit(1);
    if (received && received.length > 0) {
      throw new AppError('BUSINESS_RULE', 'A purchase with received stock cannot be cancelled.');
    }
  }
  if (next === 'COMPLETED') {
    const { error } = await supabase
      .from('purchases')
      .update({ status: next, payment_status: opts?.payment_status ?? 'PAID' })
      .eq('id', id);
    if (error) throw mapDbError(error);
  } else {
    const { error } = await supabase.from('purchases').update({ status: next, notes: opts?.notes }).eq('id', id);
    if (error) throw mapDbError(error);
  }
  await logAudit(
    next === 'CANCELLED' ? 'purchases.cancel' : next === 'COMPLETED' ? 'purchases.complete' : 'purchases.order',
    { type: 'purchase', id },
    { from: current.status, to: next },
  );
  revalidatePath('/purchases');
  revalidatePath(`/purchases/${id}`);
}

export async function receivePurchase(id: string): Promise<void> {
  await requireRole('purchases:receive');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('receive_purchase', { p_purchase_id: id });
  if (error) throw mapRpcError(error);
  await logAudit('purchases.receive', { type: 'purchase', id });
  revalidatePath('/purchases');
  revalidatePath(`/purchases/${id}`);
  revalidatePath('/inventory');
  revalidatePath('/books');
}

/**
 * Sales service (skills/bookstore-sales/SKILL.md).
 * Historical sales are immutable: void/refund are status transitions + RPCs.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { currentRole, requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError, mapDbError, mapRpcError } from '@/lib/utils/errors';
import type { SaleStatus } from '@/types/database';

export interface SaleListParams {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  status?: SaleStatus;
  search?: string;
}

export async function listSales(params: SaleListParams) {
  const role = await currentRole();
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('sales')
    .select('id,invoice_number,created_at,status,total_cents,tendered_cents,change_cents,payment_method,cashier_id,profiles!sales_cashier_id_fkey(full_name)', {
      count: 'exact',
    });
  // role scoping: cashier sees only own sales (bookstore-sales)
  if (role === 'CASHIER') query = query.eq('cashier_id', (await requireRole('sales:view_own')).id);
  if (params.from) query = query.gte('created_at', `${params.from}T00:00:00`);
  if (params.to) query = query.lte('created_at', `${params.to}T23:59:59`);
  if (params.status) query = query.eq('status', params.status);
  if (params.search) query = query.ilike('invoice_number', `%${params.search}%`);

  const from = (params.page - 1) * params.pageSize;
  query = query.order('created_at', { ascending: false }).range(from, from + params.pageSize - 1);
  const { data, count, error } = await query;
  if (error) throw mapDbError(error);
  return {
    rows: (data ?? []) as unknown as SaleListItem[],
    total: count ?? 0,
  };
}

interface SaleListItem {
  id: string;
  invoice_number: string;
  created_at: string;
  status: SaleStatus;
  total_cents: number;
  tendered_cents: number;
  change_cents: number;
  payment_method: import('@/types/database').PaymentMethod;
  cashier_id: string;
  profiles?: { full_name: string } | null;
}

export async function getSale(id: string) {
  const role = await currentRole();
  const supabase = await createSupabaseServerClient();
  const { data: sale, error } = await supabase
    .from('sales')
    .select('*,cashier:profiles!sales_cashier_id_fkey(full_name)')
    .eq('id', id)
    .single();
  if (error || !sale) throw new AppError('NOT_FOUND', 'Sale not found.');
  if (role === 'CASHIER' && sale.cashier_id !== (await requireRole('sales:view_own')).id) {
    throw new AppError('AUTHZ_ERROR');
  }

  const { data: items } = await supabase.from('sale_items').select('*').eq('sale_id', id);
  const { data: payments } = await supabase.from('payments').select('*').eq('sale_id', id);
  const { data: movements } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('reference_id', id)
    .order('created_at', { ascending: false });
  return { sale, items: items ?? [], payments: payments ?? [], movements: movements ?? [] };
}

export async function voidSale(id: string, reason: string): Promise<void> {
  await requireRole('sales:void');
  if (!reason.trim()) throw new AppError('VALIDATION_ERROR', 'A reason is required to void a sale.');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('void_sale', { p_sale_id: id, p_reason: reason.trim() });
  if (error) throw mapRpcError(error);
  await logAudit('sales.void', { type: 'sale', id }, { reason });
  revalidatePath('/sales');
  revalidatePath(`/sales/${id}`);
  revalidatePath('/books');
}

/** POS checkout — the RPC recomputes prices and validates stock (bookstore-pos). */
export const checkoutSchema = z.object({
  items: z.array(z.object({ book_id: z.string().uuid(), quantity: z.number().int().min(1) })).min(1, 'The cart is empty.'),
  payment_method: z.enum(['CASH', 'CARD', 'TRANSFER', 'MOBILE_MONEY', 'OTHER']),
  tendered_cents: z.number().int().min(0),
  discount_cents: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
});

export async function createSale(input: z.infer<typeof checkoutSchema>): Promise<{ saleId: string }> {
  await requireRole('pos:operate');
  const parsed = checkoutSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc('create_sale', {
    p_items: parsed.items,
    p_payment_method: parsed.payment_method,
    p_tendered_cents: parsed.tendered_cents,
    p_discount_cents: parsed.discount_cents,
    p_notes: parsed.notes ?? null,
  });
  if (error) throw mapRpcError(error);
  await logAudit('sales.create', { type: 'sale', id: data }, { items: parsed.items.length, total: parsed.tendered_cents });
  revalidatePath('/sales');
  revalidatePath('/books');
  revalidatePath('/dashboard');
  return { saleId: data };
}

export const refundSchema = z.object({
  sale_id: z.string().uuid(),
  items: z.array(z.object({ book_id: z.string().uuid(), quantity: z.number().int().min(1) })).min(1),
  amount_cents: z.number().int().min(1),
  reason: z.string().trim().min(1, 'A reason is required to refund.'),
});

export async function refundSale(input: z.infer<typeof refundSchema>): Promise<void> {
  await requireRole('sales:refund');
  const parsed = refundSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('refund_sale', {
    p_sale_id: parsed.sale_id,
    p_items: parsed.items,
    p_amount_cents: parsed.amount_cents,
    p_reason: parsed.reason,
  });
  if (error) throw mapRpcError(error);
  await logAudit('sales.refund', { type: 'sale', id: parsed.sale_id }, { amount_cents: parsed.amount_cents, reason: parsed.reason });
  revalidatePath('/sales');
  revalidatePath(`/sales/${parsed.sale_id}`);
  revalidatePath('/books');
}

/**
 * Inventory module (skills/bookstore-inventory/SKILL.md).
 * Stock is ONLY changed through the engine RPCs — never direct updates.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapDbError, mapRpcError } from '@/lib/utils/errors';
import type { MovementType } from '@/types/database';

export interface MovementParams {
  page: number;
  pageSize: number;
  bookId?: string;
  movementType?: MovementType;
  from?: string;
  to?: string;
}

export async function listMovements(params: MovementParams) {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from('stock_movements')
    .select('*,books(title),profiles(full_name)', { count: 'exact' });
  if (params.bookId) query = query.eq('book_id', params.bookId);
  if (params.movementType) query = query.eq('movement_type', params.movementType);
  if (params.from) query = query.gte('created_at', `${params.from}T00:00:00`);
  if (params.to) query = query.lte('created_at', `${params.to}T23:59:59`);
  const from = (params.page - 1) * params.pageSize;
  query = query.order('created_at', { ascending: false }).range(from, from + params.pageSize - 1);
  const { data, count, error } = await query;
  if (error) throw mapDbError(error);
  return { rows: data ?? [], total: count ?? 0 };
}

export async function lowStockBooks(limit = 100) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('id,title,stock,minimum_stock,status')
    .eq('status', 'ACTIVE')
    .lte('stock', 'minimum_stock')
    .order('stock', { ascending: true })
    .limit(limit);
  if (error) throw mapDbError(error);
  return data ?? [];
}

export async function outOfStockBooks() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('id,title,stock,status')
    .eq('status', 'ACTIVE')
    .eq('stock', 0)
    .limit(100);
  if (error) throw mapDbError(error);
  return data ?? [];
}

export const adjustSchema = z.object({
  book_id: z.string().uuid(),
  quantity: z.number().int().min(1, 'Quantity must be positive'),
  movement_type: z.enum(['ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'DAMAGE', 'LOSS', 'CORRECTION']),
  notes: z.string().trim().min(1, 'A note is required').max(500),
});

/** Manual stock adjustment — type defines direction; quantity is positive. */
export async function adjustStock(input: z.infer<typeof adjustSchema>) {
  await requireRole('inventory:adjust');
  const parsed = adjustSchema.parse(input);
  const direction = parsed.movement_type.includes('IN') ? 1 : -1;
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('adjust_inventory', {
    p_book_id: parsed.book_id,
    p_quantity: direction * parsed.quantity,
    p_movement_type: parsed.movement_type,
    p_notes: parsed.notes,
  });
  if (error) throw mapRpcError(error);
  await logAudit('inventory.adjust', { type: 'book', id: parsed.book_id }, {
    quantity: direction * parsed.quantity,
    movement_type: parsed.movement_type,
    notes: parsed.notes,
  });
  revalidatePath('/inventory');
  revalidatePath('/books');
  return { ok: true };
}

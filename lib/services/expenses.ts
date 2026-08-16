/**
 * Expenses service (skills/bookstore-expenses/SKILL.md).
 * Amount edits are forbidden — correct by delete + recreate (money-trail rule).
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError, mapDbError } from '@/lib/utils/errors';
import type { ExpenseCategory, ExpenseRow } from '@/types/database';

export const expenseSchema = z.object({
  category: z.enum(['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY', 'TRANSPORTATION', 'OTHER']),
  amount_cents: z.number().int().min(1, 'Amount must be greater than zero'),
  expense_date: z.string(),
  description: z.string().trim().max(500).optional().nullable(),
});

export interface ExpenseListParams {
  page: number;
  pageSize: number;
  from?: string;
  to?: string;
  category?: ExpenseCategory;
}

export async function listExpenses(params: ExpenseListParams) {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from('expenses').select('*,profiles(full_name)', { count: 'exact' });
  if (params.from) query = query.gte('expense_date', params.from);
  if (params.to) query = query.lte('expense_date', params.to);
  if (params.category) query = query.eq('category', params.category);
  const from = (params.page - 1) * params.pageSize;
  query = query.order('expense_date', { ascending: false }).range(from, from + params.pageSize - 1);
  const { data, count, error } = await query;
  if (error) throw mapDbError(error);
  return {
    rows: (data ?? []) as Array<ExpenseRow & { profiles?: { full_name: string } | null }>,
    total: count ?? 0,
  };
}

export async function createExpense(input: z.infer<typeof expenseSchema>) {
  await requireRole('expenses:manage');
  const parsed = expenseSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new AppError('AUTH_ERROR');
  const { data, error } = await supabase
    .from('expenses')
    .insert({ ...parsed, created_by: user.id })
    .select('id')
    .single();
  if (error) throw mapDbError(error);
  await logAudit('expenses.create', { type: 'expense', id: data.id }, { amount_cents: parsed.amount_cents, category: parsed.category });
  revalidatePath('/expenses');
  return { id: data.id };
}

/** Update description/category/date only — amount changes require delete+recreate. */
export async function updateExpense(
  id: string,
  input: { category?: ExpenseCategory; expense_date?: string; description?: string | null },
): Promise<void> {
  await requireRole('expenses:manage');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('expenses').update(input).eq('id', id);
  if (error) throw mapDbError(error);
  await logAudit('expenses.update', { type: 'expense', id }, input);
  revalidatePath('/expenses');
}

export async function deleteExpense(id: string): Promise<void> {
  await requireRole('expenses:manage');
  const supabase = await createSupabaseServerClient();
  const { data: row } = await supabase.from('expenses').select('amount_cents,category').eq('id', id).single();
  const { error } = await supabase.from('expenses').delete().eq('id', id);
  if (error) throw mapDbError(error);
  await logAudit('expenses.delete', { type: 'expense', id }, { amount_cents: row?.amount_cents ?? 0 });
  revalidatePath('/expenses');
}

export async function expensesSummary(from?: string, to?: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('expenses')
    .select('amount_cents,category')
    .gte('expense_date', from ?? '1970-01-01')
    .lte('expense_date', to ?? '2999-12-31');
  if (error) throw mapDbError(error);
  const totalCents = (data ?? []).reduce((s, e) => s + e.amount_cents, 0);
  return { totalCents };
}

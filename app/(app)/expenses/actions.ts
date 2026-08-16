'use server';

import { createExpense, deleteExpense, updateExpense } from '@/lib/services/expenses';
import type { ExpenseCategory } from '@/types/database';

export async function createExpenseAction(input: {
  category: ExpenseCategory;
  amount_cents: number;
  expense_date: string;
  description?: string | null;
}) {
  return createExpense(input);
}

export async function updateExpenseAction(
  id: string,
  input: { category?: ExpenseCategory; expense_date?: string; description?: string | null },
) {
  return updateExpense(id, input);
}

export async function deleteExpenseAction(id: string) {
  return deleteExpense(id);
}

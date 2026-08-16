'use server';

import { adjustStock } from '@/lib/inventory/queries';

export async function adjustStockAction(input: {
  book_id: string;
  quantity: number;
  movement_type: 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS' | 'CORRECTION';
  notes: string;
}) {
  return adjustStock(input);
}

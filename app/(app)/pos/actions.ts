'use server';

import { logAudit } from '@/lib/audit/log';
import { buildReceiptData } from '@/lib/receipt/build';
import { createSale } from '@/lib/services/sales';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export interface PosBook {
  id: string;
  title: string;
  isbn: string | null;
  barcode: string | null;
  author: string;
  selling_price_cents: number;
  stock: number;
  coverUrl: string | null;
}

/** Server-side product search for the POS (GIN trigram index). */
export async function searchPosBooks(query: string, limit = 20): Promise<PosBook[]> {
  const supabase = await createSupabaseServerClient();
  const term = query.trim();
  if (!term) return [];

  let q = supabase
    .from('books')
    .select('id,title,isbn,barcode,author,selling_price_cents,stock,status')
    .eq('status', 'ACTIVE')
    .limit(limit);
  q = q.or(`title.ilike.%${term}%,author.ilike.%${term}%,isbn.ilike.%${term}%,barcode.ilike.%${term}%`);

  const { data, error } = await q;
  if (error) return [];

  const ids = (data ?? []).map((b) => b.id);
  const covers = new Map<string, string>();
  if (ids.length > 0) {
    const { data: imgs } = await supabase
      .from('book_images')
      .select('book_id,url')
      .in('book_id', ids)
      .eq('is_primary', true);
    (imgs ?? []).forEach((img) => covers.set(img.book_id, img.url));
  }

  return (data ?? []).map((b) => ({
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    barcode: b.barcode,
    author: b.author,
    selling_price_cents: b.selling_price_cents,
    stock: b.stock,
    coverUrl: covers.get(b.id) ?? null,
  }));
}

export async function checkoutAction(input: {
  items: Array<{ book_id: string; quantity: number }>;
  payment_method: 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE_MONEY' | 'OTHER';
  tendered_cents: number;
  discount_cents: number;
}) {
  return createSale(input);
}

export async function getReceiptDataAction(saleId: string) {
  return buildReceiptData(saleId);
}

export async function auditReceiptPrintAction(saleId: string) {
  await logAudit('receipt.print', { type: 'sale', id: saleId });
}

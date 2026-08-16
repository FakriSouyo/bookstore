/**
 * Report registry (skills/bookstore-reports/SKILL.md).
 * One implementation per metric; dashboard, pages, and exports all use it.
 * Aggregation happens in SQL (RPCs/views); grouping small bounded rows in JS
 * is allowed (e.g. monthly bucketing of a 366-row daily series).
 */

import { listExpenses } from '@/lib/services/expenses';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { formatMoney } from '@/lib/utils/money';

export type ReportKey =
  | 'daily-sales'
  | 'best-sellers'
  | 'low-stock'
  | 'out-of-stock'
  | 'stock-movements'
  | 'expenses'
  | 'cashier-performance'
  | 'profit';

export interface ReportResult {
  title: string;
  columns: string[];
  rows: Array<Record<string, unknown>>;
  moneyColumns: string[];
  /** Indonesian header labels for report columns. */
  columnLabels?: Record<string, string>;
}

export interface ReportParams {
  from?: string;
  to?: string;
  limit?: number;
}

type Run = (p: ReportParams) => Promise<ReportResult>;

export const REPORTS: Record<ReportKey, { label: string; description: string; run: Run }> = {
  'daily-sales': {
    label: 'Penjualan Harian',
    description: 'Pendapatan, laba, dan transaksi per hari.',
    run: async ({ from, to }) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.rpc('revenue_series', {
        p_from: from ?? '2000-01-01',
        p_to: to ?? '2999-12-31',
      });
      const rows = ((data ?? []) as Array<{ day: string; revenue_cents: number; profit_cents: number; transactions: number }>).map(
        (r) => ({ day: r.day, revenue: formatMoney(r.revenue_cents), profit: formatMoney(r.profit_cents), transactions: r.transactions }),
      );
      return {
        title: 'Penjualan Harian',
        columns: ['day', 'revenue', 'profit', 'transactions'],
        columnLabels: { day: 'Tanggal', revenue: 'Pendapatan', profit: 'Laba', transactions: 'Transaksi' },
        rows,
        moneyColumns: ['revenue', 'profit'],
      };
    },
  },
  'best-sellers': {
    label: 'Buku Terlaris',
    description: 'Buku teratas berdasarkan jumlah terjual.',
    run: async ({ from, to, limit }) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.rpc('top_sellers', {
        p_from: from ?? '2000-01-01',
        p_to: to ?? '2999-12-31',
        p_limit: limit ?? 25,
      });
      const rows = ((data ?? []) as Array<{ title: string; total_qty: number; revenue_cents: number }>).map((r) => ({
        title: r.title,
        quantity: r.total_qty,
        revenue: formatMoney(r.revenue_cents),
      }));
      return {
        title: 'Buku Terlaris',
        columns: ['title', 'quantity', 'revenue'],
        columnLabels: { title: 'Judul', quantity: 'Jumlah', revenue: 'Pendapatan' },
        rows,
        moneyColumns: ['revenue'],
      };
    },
  },
  'low-stock': {
    label: 'Stok Menipis',
    description: 'Buku aktif dengan stok di atau di bawah minimum.',
    run: async ({ limit }) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('books')
        .select('title,isbn,stock,minimum_stock')
        .eq('status', 'ACTIVE')
        .lte('stock', 'minimum_stock')
        .order('stock', { ascending: true })
        .limit(limit ?? 200);
      const rows = ((data ?? []) as Array<{ title: string; isbn: string | null; stock: number; minimum_stock: number }>).map((r) => ({
        title: r.title,
        isbn: r.isbn ?? '—',
        stock: r.stock,
        minimum: r.minimum_stock,
      }));
      return {
        title: 'Stok Menipis',
        columns: ['title', 'isbn', 'stock', 'minimum'],
        columnLabels: { title: 'Judul', isbn: 'ISBN', stock: 'Stok', minimum: 'Min' },
        rows,
        moneyColumns: [],
      };
    },
  },
  'out-of-stock': {
    label: 'Stok Habis',
    description: 'Buku aktif dengan stok nol.',
    run: async ({ limit }) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase
        .from('books')
        .select('title,isbn,stock')
        .eq('status', 'ACTIVE')
        .eq('stock', 0)
        .order('title', { ascending: true })
        .limit(limit ?? 200);
      const rows = ((data ?? []) as Array<{ title: string; isbn: string | null }>).map((r) => ({ title: r.title, isbn: r.isbn ?? '—' }));
      return {
        title: 'Stok Habis',
        columns: ['title', 'isbn'],
        columnLabels: { title: 'Judul', isbn: 'ISBN' },
        rows,
        moneyColumns: [],
      };
    },
  },
  'stock-movements': {
    label: 'Pergerakan Stok',
    description: 'Setiap pergerakan stok pada periode.',
    run: async ({ from, to, limit }) => {
      const supabase = await createSupabaseServerClient();
      let q = supabase.from('stock_movements').select('created_at,books(title),quantity,movement_type,previous_stock,new_stock,notes');
      if (from) q = q.gte('created_at', `${from}T00:00:00`);
      if (to) q = q.lte('created_at', `${to}T23:59:59`);
      const { data } = await q.order('created_at', { ascending: false }).limit(limit ?? 500);
      const rows = ((data ?? []) as Array<Record<string, unknown>>).map((r) => ({
        date: String(r.created_at),
        book: (r as { books?: { title?: string } }).books?.title ?? '—',
        type: String(r.movement_type),
        quantity: r.quantity,
        from: r.previous_stock,
        to: r.new_stock,
        notes: r.notes ?? '',
      }));
      return {
        title: 'Pergerakan Stok',
        columns: ['date', 'book', 'type', 'quantity', 'from', 'to', 'notes'],
        columnLabels: { date: 'Tanggal', book: 'Buku', type: 'Jenis', quantity: 'Jumlah', from: 'Dari', to: 'Ke', notes: 'Catatan' },
        rows,
        moneyColumns: [],
      };
    },
  },
  expenses: {
    label: 'Pengeluaran',
    description: 'Pengeluaran operasional pada periode.',
    run: async ({ from, to }) => {
      const { rows } = await listExpenses({ page: 1, pageSize: 1000, from, to });
      const mapped = rows.map((r) => ({
        date: r.expense_date,
        category: r.category,
        amount: formatMoney(r.amount_cents),
        description: r.description ?? '',
      }));
      return {
        title: 'Pengeluaran',
        columns: ['date', 'category', 'amount', 'description'],
        columnLabels: { date: 'Tanggal', category: 'Kategori', amount: 'Jumlah', description: 'Deskripsi' },
        rows: mapped,
        moneyColumns: ['amount'],
      };
    },
  },
  'cashier-performance': {
    label: 'Kinerja Kasir',
    description: 'Transaksi dan pendapatan per kasir.',
    run: async ({ from, to }) => {
      const supabase = await createSupabaseServerClient();
      let q = supabase.from('sales').select('cashier_id,profiles!sales_cashier_id_fkey(full_name),total_cents');
      if (from) q = q.gte('created_at', `${from}T00:00:00`);
      if (to) q = q.lte('created_at', `${to}T23:59:59`);
      q = q.eq('status', 'COMPLETED');
      const { data } = await q.limit(10000);
      const byCashier = new Map<string, { name: string; count: number; revenue: number }>();
      type SaleRow = { cashier_id: string; profiles?: Array<{ full_name: string }> | null; total_cents: number };
      for (const s of (data ?? []) as SaleRow[]) {
        const entry = byCashier.get(s.cashier_id) ?? {
          name: s.profiles?.[0]?.full_name ?? 'Unknown',
          count: 0,
          revenue: 0,
        };
        entry.count += 1;
        entry.revenue += s.total_cents;
        byCashier.set(s.cashier_id, entry);
      }
      const rows = [...byCashier.values()].map((e) => ({ cashier: e.name, transactions: e.count, revenue: formatMoney(e.revenue) }));
      return {
        title: 'Kinerja Kasir',
        columns: ['cashier', 'transactions', 'revenue'],
        columnLabels: { cashier: 'Kasir', transactions: 'Transaksi', revenue: 'Pendapatan' },
        rows,
        moneyColumns: ['revenue'],
      };
    },
  },
  profit: {
    label: 'Laba',
    description: 'Laba kotor per hari dan bersih setelah pengeluaran.',
    run: async ({ from, to }) => {
      const supabase = await createSupabaseServerClient();
      const { data } = await supabase.rpc('revenue_series', {
        p_from: from ?? '2000-01-01',
        p_to: to ?? '2999-12-31',
      });
      const { rows: exp } = await listExpenses({ page: 1, pageSize: 1000, from, to });
      const expenseTotal = exp.reduce((s, e) => s + e.amount_cents, 0);
      const gross = ((data ?? []) as Array<{ profit_cents: number }>).reduce((s, r) => s + r.profit_cents, 0);
      const rows = [
        { item: 'Laba kotor (penjualan)', amount: formatMoney(gross) },
        { item: 'Pengeluaran', amount: formatMoney(expenseTotal) },
        { item: 'Laba bersih', amount: formatMoney(gross - expenseTotal) },
      ];
      return {
        title: 'Laba',
        columns: ['item', 'amount'],
        columnLabels: { item: 'Item', amount: 'Jumlah' },
        rows,
        moneyColumns: ['amount'],
      };
    },
  },
};

export const REPORT_KEYS = Object.keys(REPORTS) as ReportKey[];

export async function runReport(key: ReportKey, params: ReportParams): Promise<ReportResult> {
  const def = REPORTS[key];
  if (!def) throw new Error('Unknown report');
  return def.run(params);
}

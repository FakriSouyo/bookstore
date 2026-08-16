// Map which business RPCs currently work on the deployed (possibly drifted) DB.
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const sb = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } },
  auth: { persistSession: false, autoRefreshToken: false },
});

const bogus = '00000000-0000-0000-0000-000000000000';

const probes = [
  ['create_sale', { p_items: [{ book_id: bogus, quantity: 1 }], p_payment_method: 'CASH', p_tendered_cents: 10000, p_discount_cents: 0, p_notes: null }],
  ['create_purchase', { p_supplier_id: bogus, p_invoice_number: 'PROBE-1', p_purchase_date: '2026-01-01', p_items: [{ book_id: bogus, quantity: 1, unit_cost_cents: 1000 }], p_discount_cents: 0, p_shipping_cents: 0, p_tax_cents: 0, p_notes: null }],
  ['dashboard_kpis', { p_from: '2026-01-01T00:00:00Z', p_to: '2027-01-01T00:00:00Z' }],
  ['revenue_series', { p_from: '2026-01-01', p_to: '2026-01-31' }],
];

for (const [fn, args] of probes) {
  const { data, error } = await sb.rpc(fn, args);
  const firstErr = error?.message?.split('\n')[0] ?? '';
  console.log(`${fn} ->`, error ? `ERROR: ${firstErr}` : `OK ${JSON.stringify(data)?.slice(0, 80)}`);
}

// Probe deployed DB function state: is receive_purchase/adjust_inventory synced?
// (0005_sync_functions.sql was generated because the deployed DB had functions
//  calling assert_role(text[]) which does not exist -> feature broken.)
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (!url || !anonKey) { console.error('missing env'); process.exit(1); }

const sb = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}` } },
  auth: { persistSession: false, autoRefreshToken: false },
});

const bogusId = '00000000-0000-0000-0000-000000000000';

// If function body references assert_role(text[]) -> "function assert_role(text[]) does not exist"
const rp = await sb.rpc('receive_purchase', { p_purchase_id: bogusId });
console.log('receive_purchase ->', rp.error ? `ERROR: ${rp.error.message}` : `OK (${JSON.stringify(rp.data)})`);

const ai = await sb.rpc('adjust_inventory', { p_book_id: bogusId, p_quantity: 1, p_movement_type: 'ADJUSTMENT_IN', p_notes: 'probe' });
console.log('adjust_inventory ->', ai.error ? `ERROR: ${ai.error.message}` : `OK (${JSON.stringify(ai.data)})`);

// Data state
for (const t of ['books', 'sales', 'purchases', 'stock_movements']) {
  const { count } = await sb.from(t).select('id', { count: 'exact', head: true });
  console.log(`${t}: ${count}`);
}

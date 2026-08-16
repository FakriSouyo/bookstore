// Probe business RPCs with a REAL user session (what the app uses),
// to distinguish "authz broken" from "service-role probe artifact".
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// 1. sign in as demo OWNER
const auth = createClient(url, anonKey, { auth: { persistSession: false, autoRefreshToken: false } });
const { data: sess, error: se } = await auth.auth.signInWithPassword({ email: 'demo.owner@bookstore.test', password: 'DemoOwner123!' });
if (se) { console.log('signIn -> ERROR:', se.message); process.exit(1); }
const sb = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${sess.session.access_token}` } },
  auth: { persistSession: false, autoRefreshToken: false },
});
console.log('✓ signed in as demo OWNER');

// 2. a real supplier + book (from the partial seed)
const { data: sup } = await sb.from('suppliers').select('id').limit(1).single();
const { data: book } = await sb.from('books').select('id,title,stock').eq('status', 'ACTIVE').limit(1).single();
console.log(`  book: "${book.title}" stock=${book.stock}`);

// 3. create_purchase (expect OK -> returns id)
const cp = await sb.rpc('create_purchase', {
  p_supplier_id: sup.id, p_invoice_number: `PROBE-${Date.now()}`,
  p_purchase_date: '2026-08-01', p_discount_cents: 0, p_shipping_cents: 0, p_tax_cents: 0, p_notes: 'probe',
  p_items: [{ book_id: book.id, quantity: 5, unit_cost_cents: 10000 }],
});
console.log('create_purchase (owner) ->', cp.error ? `ERROR: ${cp.error.message.split('\n')[0]}` : `OK id=${cp.data}`);

// 4. create_sale on a stock-0 book: authz must pass, then NEGATIVE_STOCK must block
const cs = await sb.rpc('create_sale', {
  p_items: [{ book_id: book.id, quantity: 1 }], p_payment_method: 'CASH',
  p_tendered_cents: 50000, p_discount_cents: 0, p_notes: null,
});
console.log('create_sale qty1 on stock-0 book ->', cs.error ? `ERROR: ${cs.error.message.split('\n')[0]}` : `OK id=${cs.data}`);

// 5. receive_purchase on the DRAFT purchase (expect assert_role drift error if 0005 not applied)
if (!cp.error) {
  const rv = await sb.rpc('receive_purchase', { p_purchase_id: cp.data });
  console.log('receive_purchase ->', rv.error ? `ERROR: ${rv.error.message.split('\n')[0]}` : `OK (stock should now be 5)`);
}

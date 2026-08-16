// Benchmarks the 4 dashboard RPCs against live Supabase. Run:
//   node --env-file=.env scripts/bench-dashboard.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key, { auth: { persistSession: false } });

const day = new Date();
const from = new Date(day.getFullYear(), day.getMonth(), day.getDate()).toISOString();
const to = new Date(day.getFullYear(), day.getMonth(), day.getDate() + 1).toISOString();
const from30 = new Date(day.getTime() - 29 * 864e5).toISOString().slice(0, 10);
const toT = day.toISOString().slice(0, 10);

async function t(name, fn) {
  const s = Date.now();
  try {
    await fn();
    console.log(name.padEnd(10), (Date.now() - s) + 'ms');
  } catch (e) {
    console.log(name.padEnd(10), 'ERR', e.message);
  }
}

for (let i = 0; i < 2; i++) {
  console.log(`--- run ${i + 1} ---`);
  await t('kpis', () => sb.rpc('dashboard_kpis', { p_from: from, p_to: to }));
  await t('series', () => sb.rpc('revenue_series', { p_from: from30, p_to: toT }));
  await t('top', () => sb.rpc('top_sellers', { p_from: from30, p_to: toT, p_limit: 10 }));
  await t('cats', () => sb.rpc('sales_by_category', { p_from: from30, p_to: toT }));
}

// scripts/check-supabase.mjs — verifikasi koneksi Supabase (tanpa print rahasia)
// Jalankan: node --env-file=.env scripts/check-supabase.mjs
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('FAIL: env NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY belum diisi');
  process.exit(1);
}

const sb = createClient(url, anon);

const checks = [
  ['select store_settings', sb.from('store_settings').select('id, store_name')],
  ['select books (count)', sb.from('books').select('id', { count: 'exact', head: true })],
  ['rpc dashboard_kpis', sb.rpc('dashboard_kpis', { p_from: '2026-01-01', p_to: '2026-12-31' })],
];

for (const [name, promise] of checks) {
  const { data, error, count } = await promise;
  if (error) {
    console.log('  ' + name + ': ERR ' + (error.code ?? '') + ' ' + error.message);
  } else if (count !== undefined) {
    console.log('  ' + name + ': OK (rows=' + count + ')');
  } else if (data !== null) {
    console.log('  ' + name + ': OK (' + JSON.stringify(data).slice(0, 80) + ')');
  } else {
    console.log('  ' + name + ': OK');
  }
}

console.log('Selesai. (anon + RLS: tabel tanpa policy anon wajar mengembalikan 0 baris)');

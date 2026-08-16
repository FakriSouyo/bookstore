// Measures the per-request auth cost: supabase.auth.getUser() + profiles lookup.
// Usage: node --env-file=.env scripts/bench-auth.mjs "<sb-...-auth-token=base64...>"
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const raw = process.argv[2];
if (!url || !anonKey || !raw) {
  console.error('usage: node --env-file=.env scripts/bench-auth.mjs "<sb-...-auth-token=base64...>"');
  process.exit(1);
}

// The cookie value is "base64-<base64url-JSON>". Extract the access_token and
// send it as a proper Authorization header (supabase-js does not read cookies).
const b64 = raw.replace(/^base64-/, '');
const parsed = JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
const accessToken = parsed.access_token;
if (!accessToken) {
  console.error('no access_token found in cookie');
  process.exit(1);
}

const supabase = createClient(url, anonKey, {
  global: { headers: { Authorization: `Bearer ${accessToken}` } },
  auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
});

for (let run = 0; run < 3; run++) {
  const t0 = performance.now();
  const { data } = await supabase.auth.getUser();
  const t1 = performance.now();
  const userId = data?.user?.id;
  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('full_name, role, is_active')
    .eq('id', userId)
    .single();
  const t2 = performance.now();
  console.log(
    `run ${run + 1}: getUser ${Math.round(t1 - t0)}ms | profile ${Math.round(t2 - t1)}ms | total ${Math.round(t2 - t0)}ms | role=${profile?.role ?? (pErr ? `ERR(${pErr.code ?? pErr.message})` : '?')}`,
  );
}

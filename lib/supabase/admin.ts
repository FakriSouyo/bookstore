import 'server-only';

import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Service-role client — BYPASSES RLS. Server-only (import 'server-only').
 * Every call through this client must be gated by requireRole and audited
 * (bookstore-auth / bookstore-security). Never import in client code.
 */
export function createSupabaseAdminClient() {
  return createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

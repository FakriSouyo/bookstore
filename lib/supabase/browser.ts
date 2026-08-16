'use client';

import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

/** Client components — RLS-gated reads only; mutations go through server actions. */
export function createSupabaseBrowserClient() {
  return createBrowserClient(url, anonKey);
}

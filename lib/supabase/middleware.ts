import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';

const PUBLIC_PATHS = ['/login', '/forgot-password', '/reset-password'];

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  // No backend provisioned yet — let the request through (pages surface a
  // clear config error). Avoids a 500 on every route during local setup.
  if (!url || !anonKey) return response;

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  // Fast path: read the session from cookies (local, no network round-trip).
  // getUser() would verify the JWT against Supabase on EVERY navigation — the
  // main source of perceived page-change lag. Real auth checks still happen
  // in server components via createSupabaseServerClient (getUser).
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user ?? null;

  const isPublic = PUBLIC_PATHS.some((p) => request.nextUrl.pathname.startsWith(p));
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    return NextResponse.redirect(url);
  }

  return response;
}

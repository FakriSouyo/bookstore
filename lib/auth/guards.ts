/**
 * Server-side authorization (skills/bookstore-auth/SKILL.md).
 * requireRole throws AppError for actions; pages use hasPermission + notFound().
 */

import { cache } from 'react';
import { redirect } from 'next/navigation';

import { can, type Permission } from '@/lib/permissions/permissions';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError } from '@/lib/utils/errors';
import type { AppRole } from '@/types/database';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}

/**
 * Fetches the session user. Wrapped in React cache() so the layout's requireUser()
 * and every page's hasPermission() share ONE getUser()+profile round trip per request
 * instead of re-hitting Supabase for each check (this was a major navigation lag source).
 */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, role, is_active')
    .eq('id', user.id)
    .single();

  if (!profile || !profile.is_active) return null; // deactivated users are treated as signed out
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: profile.full_name as string,
    role: profile.role as AppRole,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const session = await getSessionUser();
  if (!session) redirect('/login');
  return session;
}

/** Throws AUTHZ_ERROR — use in server actions / route handlers. */
export async function requireRole(permission: Permission): Promise<SessionUser> {
  const session = await requireUser();
  if (!can(session.role, permission)) {
    throw new AppError('AUTHZ_ERROR');
  }
  return session;
}

/** Boolean check — use in pages to render 404/403. */
export async function hasPermission(permission: Permission): Promise<boolean> {
  const session = await getSessionUser();
  return session ? can(session.role, permission) : false;
}

/** For query scoping: does the caller see all sales or only their own? */
export async function currentRole(): Promise<AppRole | null> {
  const session = await getSessionUser();
  return session?.role ?? null;
}

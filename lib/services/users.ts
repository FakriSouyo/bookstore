/**
 * User management service (skills/bookstore-auth/SKILL.md) — OWNER only.
 * Uses the admin client (bypasses RLS) → every call gated + audited.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError, mapDbError } from '@/lib/utils/errors';
import type { AppRole, ProfileRow } from '@/types/database';

export async function listUsers() {
  await requireRole('users:manage');
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id,full_name,role,is_active,phone,created_at')
    .order('created_at', { ascending: false });
  if (error) throw mapDbError(error);
  return (data ?? []) as ProfileRow[];
}

export const createUserSchema = z.object({
  email: z.string().email(),
  full_name: z.string().trim().min(1),
  role: z.enum(['OWNER', 'ADMIN', 'CASHIER']),
});

export async function createUser(input: z.infer<typeof createUserSchema>): Promise<{ id: string }> {
  await requireRole('users:manage');
  const parsed = createUserSchema.parse(input);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin.auth.admin.createUser({
    email: parsed.email,
    password: crypto.randomUUID().replace(/-/g, '').slice(0, 16),
    email_confirm: true,
    user_metadata: { full_name: parsed.full_name },
  });
  if (error) throw new AppError('VALIDATION_ERROR', 'Could not create user: ' + error.message);
  const { error: profileError } = await admin
    .from('profiles')
    .update({ role: parsed.role, full_name: parsed.full_name })
    .eq('id', data.user.id);
  if (profileError) throw mapDbError(profileError);
  await logAudit('users.create', { type: 'user', id: data.user.id }, { role: parsed.role, email: parsed.email });
  revalidatePath('/users');
  return { id: data.user.id };
}

export async function updateUserRole(userId: string, role: AppRole): Promise<void> {
  await requireRole('users:manage');
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('profiles').update({ role }).eq('id', userId);
  if (error) throw mapDbError(error);
  await logAudit('users.role_change', { type: 'user', id: userId }, { role });
  revalidatePath('/users');
}

export async function setUserActive(userId: string, isActive: boolean): Promise<void> {
  await requireRole('users:manage');
  const admin = createSupabaseAdminClient();
  const { error } = await admin.from('profiles').update({ is_active: isActive }).eq('id', userId);
  if (error) throw mapDbError(error);
  if (!isActive) await admin.auth.admin.signOut(userId);
  await logAudit(isActive ? 'users.activate' : 'users.deactivate', { type: 'user', id: userId }, {});
  revalidatePath('/users');
}

/**
 * Categories / Publishers / Suppliers services (F-05).
 * Three small CRUD modules sharing one pattern; each has its own permission
 * (categories:manage / publishers:manage / suppliers:manage).
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { mapDbError } from '@/lib/utils/errors';
import { uniqueSlug } from '@/lib/utils/slug';

export type CatalogTable = 'categories' | 'publishers' | 'suppliers';
type CatalogPermission = 'categories:manage' | 'publishers:manage' | 'suppliers:manage';
import type { AuditAction } from '@/lib/audit/log';

const AUDIT_MAP: Record<CatalogTable, { create: AuditAction; update: AuditAction }> = {
  categories: { create: 'categories.create', update: 'categories.update' },
  publishers: { create: 'publishers.create', update: 'publishers.update' },
  suppliers: { create: 'suppliers.create', update: 'suppliers.update' },
};

const TABLE_PERMISSION: Record<CatalogTable, CatalogPermission> = {
  categories: 'categories:manage',
  publishers: 'publishers:manage',
  suppliers: 'suppliers:manage',
};

export async function listCatalog(table: CatalogTable, activeOnly = false): Promise<Array<Record<string, unknown>>> {
  const supabase = await createSupabaseServerClient();
  let query = supabase.from(table).select('*').order('name', { ascending: true });
  if (activeOnly && table !== 'publishers') query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) throw mapDbError(error);
  return (data ?? []) as Array<Record<string, unknown>>;
}

export async function createCatalogEntry(
  table: CatalogTable,
  input: { name: string; description?: string; contact_person?: string; phone?: string; email?: string; address?: string; country?: string },
): Promise<{ id: string }> {
  await requireRole(TABLE_PERMISSION[table]);
  const parsed = z
    .object({
      name: z.string().trim().min(1).max(200),
      description: z.string().optional().nullable(),
      contact_person: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      email: z.string().optional().nullable(),
      address: z.string().optional().nullable(),
      country: z.string().optional().nullable(),
    })
    .parse(input);

  const supabase = await createSupabaseServerClient();
  const slug = await uniqueSlug(parsed.name, async (s) => {
    const { data } = await supabase.from(table).select('id').eq('slug', s).maybeSingle();
    return !!data;
  });
  const { data, error } = await supabase
    .from(table)
    .insert({ ...parsed, slug })
    .select('id')
    .single();
  if (error) throw mapDbError(error);
  await logAudit(AUDIT_MAP[table].create, { type: table, id: data.id }, { name: parsed.name });
  revalidatePath(`/${table}`);
  return { id: data.id };
}

export async function updateCatalogEntry(
  table: CatalogTable,
  id: string,
  input: { name?: string; description?: string; contact_person?: string; phone?: string; email?: string; address?: string; country?: string },
): Promise<void> {
  await requireRole(TABLE_PERMISSION[table]);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(table).update(input).eq('id', id);
  if (error) throw mapDbError(error);
  await logAudit(AUDIT_MAP[table].update, { type: table, id }, input);
  revalidatePath(`/${table}`);
}

export async function setCatalogActive(table: CatalogTable, id: string, isActive: boolean): Promise<void> {
  await requireRole(TABLE_PERMISSION[table]);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from(table).update({ is_active: isActive }).eq('id', id);
  if (error) throw mapDbError(error);
  await logAudit(AUDIT_MAP[table].update, { type: table, id }, { is_active: isActive });
  revalidatePath(`/${table}`);
}

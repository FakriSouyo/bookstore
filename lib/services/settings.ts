/**
 * Store settings service (skills/bookstore-receipt / bookstore-core assumptions).
 * Singleton row (id = 1); only OWNER may update.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError, mapDbError } from '@/lib/utils/errors';
import type { StoreSettingsRow } from '@/types/database';

export const settingsSchema = z.object({
  store_name: z.string().trim().min(1, 'Store name is required').max(200),
  store_address: z.string().optional().nullable(),
  store_phone: z.string().optional().nullable(),
  receipt_footer: z.string().max(300).optional().nullable(),
  receipt_width: z.enum(['58', '80']),
  currency: z.string().length(3, '3-letter currency code'),
  allow_negative_stock: z.boolean().default(false),
  max_discount_percent: z.number().int().min(0).max(100),
  tax_rate_bps: z.number().int().min(0).max(10000),
});

export async function getSettings(): Promise<StoreSettingsRow> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from('store_settings').select('*').eq('id', 1).single();
  if (error || !data) throw new AppError('NOT_FOUND', 'Store settings not found.');
  return data as StoreSettingsRow;
}

export async function saveSettings(input: z.infer<typeof settingsSchema>): Promise<void> {
  await requireRole('settings:manage');
  const parsed = settingsSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from('store_settings')
    .update({ ...parsed, updated_by: user?.id ?? null })
    .eq('id', 1);
  if (error) throw mapDbError(error);
  await logAudit('settings.update', { type: 'settings', id: '1' }, { fields: Object.keys(parsed) });
  revalidatePath('/settings');
}

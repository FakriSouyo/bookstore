/**
 * Central audit helper (skills/bookstore-audit/SKILL.md).
 * Called AFTER the business operation succeeds; never fails the operation.
 */

import { createSupabaseServerClient } from '@/lib/supabase/server';

export type AuditAction =
  | 'categories.create' | 'categories.update' | 'categories.delete'
  | 'publishers.create' | 'publishers.update' | 'publishers.delete'
  | 'suppliers.create' | 'suppliers.update' | 'suppliers.delete'
  | 'users.create' | 'users.update' | 'users.role_change' | 'users.deactivate' | 'users.activate'
  | 'books.create' | 'books.update' | 'books.archive' | 'books.restore'
  | 'books.image_upload' | 'books.image_replace' | 'books.image_delete' | 'books.image_primary'
  | 'inventory.adjust'
  | 'purchases.create' | 'purchases.order' | 'purchases.receive' | 'purchases.complete' | 'purchases.cancel' | 'purchases.payment'
  | 'sales.create' | 'sales.void' | 'sales.refund' | 'receipt.print'
  | 'expenses.create' | 'expenses.update' | 'expenses.delete'
  | 'settings.update'
  | 'reports.export';

export async function logAudit(
  action: AuditAction,
  entity?: { type: string; id: string },
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    await supabase.from('audit_logs').insert({
      user_id: user?.id ?? null,
      action,
      entity_type: entity?.type ?? null,
      entity_id: entity?.id ?? null,
      metadata,
    });
  } catch (err) {
    // Audit must never break the business operation.
    console.error('[audit] failed to write', action, err);
  }
}

/**
 * Central permission matrix — single source of truth for role-based access
 * (skills/bookstore-auth/SKILL.md). No component may inline role checks.
 */

import type { AppRole } from '@/types/database';

export type Permission =
  | 'books:read' | 'books:create' | 'books:update' | 'books:delete'
  | 'categories:manage' | 'publishers:manage' | 'suppliers:manage'
  | 'inventory:read' | 'inventory:adjust'
  | 'purchases:view' | 'purchases:create' | 'purchases:update' | 'purchases:receive'
  | 'pos:operate'
  | 'sales:view_own' | 'sales:view_all' | 'sales:void' | 'sales:refund'
  | 'receipt:print'
  | 'expenses:view' | 'expenses:manage'
  | 'reports:view'
  | 'users:manage' | 'settings:manage' | 'audit:view';

const ALL: Permission[] = [
  'books:read', 'books:create', 'books:update', 'books:delete',
  'categories:manage', 'publishers:manage', 'suppliers:manage',
  'inventory:read', 'inventory:adjust',
  'purchases:view', 'purchases:create', 'purchases:update', 'purchases:receive',
  'pos:operate', 'sales:view_own', 'sales:view_all', 'sales:void', 'sales:refund',
  'receipt:print', 'expenses:view', 'expenses:manage', 'reports:view',
  'users:manage', 'settings:manage', 'audit:view',
];

const ADMIN_EXCLUDED: Permission[] = ['users:manage', 'settings:manage', 'audit:view'];

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  OWNER: [...ALL],
  ADMIN: [...ALL].filter((p) => !ADMIN_EXCLUDED.includes(p)),
  CASHIER: ['books:read', 'inventory:read', 'pos:operate', 'sales:view_own', 'receipt:print'],
};

export function can(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

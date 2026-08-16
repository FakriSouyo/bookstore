import { describe, expect, it } from 'vitest';
import { can, ROLE_PERMISSIONS } from './permissions';

describe('permission matrix', () => {
  it('gives OWNER everything', () => {
    for (const p of ROLE_PERMISSIONS.OWNER) {
      expect(can('OWNER', p)).toBe(true);
    }
    expect(ROLE_PERMISSIONS.OWNER.length).toBeGreaterThan(ROLE_PERMISSIONS.ADMIN.length);
  });

  it('gives ADMIN all operational permissions except users/settings/audit', () => {
    expect(can('ADMIN', 'books:create')).toBe(true);
    expect(can('ADMIN', 'inventory:adjust')).toBe(true);
    expect(can('ADMIN', 'purchases:receive')).toBe(true);
    expect(can('ADMIN', 'users:manage')).toBe(false);
    expect(can('ADMIN', 'settings:manage')).toBe(false);
    expect(can('ADMIN', 'audit:view')).toBe(false);
  });

  it('gives CASHIER only POS, sales view-own, and receipt printing', () => {
    expect(can('CASHIER', 'pos:operate')).toBe(true);
    expect(can('CASHIER', 'sales:view_own')).toBe(true);
    expect(can('CASHIER', 'receipt:print')).toBe(true);
    expect(can('CASHIER', 'inventory:read')).toBe(true);
    expect(can('CASHIER', 'inventory:adjust')).toBe(false);
    expect(can('CASHIER', 'books:create')).toBe(false);
    expect(can('CASHIER', 'purchases:create')).toBe(false);
    expect(can('CASHIER', 'sales:void')).toBe(false);
    expect(can('CASHIER', 'reports:view')).toBe(false);
  });

  it('returns false for unknown roles', () => {
    expect(can('UNKNOWN' as never, 'pos:operate')).toBe(false);
  });
});

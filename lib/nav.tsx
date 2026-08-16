import {
  BarChart3,
  BookOpen,
  Boxes,
  Building2,
  CircleHelp,
  LayoutDashboard,
  Package,
  ReceiptText,
  ScrollText,
  Settings,
  ShoppingCart,
  Tags,
  Truck,
  Users,
  Wallet,
} from 'lucide-react';
import type { ReactNode } from 'react';

import { can, type Permission } from '@/lib/permissions/permissions';

export type NavGroup = 'utama' | 'katalog' | 'operasional' | 'analitik' | 'sistem';

export interface NavItem {
  key: string;
  label: string;
  href: string;
  icon: ReactNode;
  permission?: Permission;
  /** Sidebar/menu section (see lib/nav.tsx — NAV_GROUPS). */
  group: NavGroup;
  /** Shown on the mobile bottom navigation bar. */
  bottomNav?: boolean;
}

export const NAV_GROUPS: Record<NavGroup, string> = {
  utama: 'Utama',
  katalog: 'Katalog',
  operasional: 'Operasional',
  analitik: 'Analitik',
  sistem: 'Sistem',
};

export const NAV_ITEMS: NavItem[] = [
  { key: 'dashboard', label: 'Dasbor', href: '/dashboard', icon: <LayoutDashboard />, group: 'utama', bottomNav: true },
  { key: 'pos', label: 'POS', href: '/pos', icon: <ShoppingCart />, permission: 'pos:operate', group: 'utama', bottomNav: true },
  { key: 'books', label: 'Buku', href: '/books', icon: <BookOpen />, group: 'katalog', bottomNav: true },
  { key: 'categories', label: 'Kategori', href: '/categories', icon: <Tags />, permission: 'categories:manage', group: 'katalog' },
  { key: 'publishers', label: 'Penerbit', href: '/publishers', icon: <Building2 />, permission: 'publishers:manage', group: 'katalog' },
  { key: 'suppliers', label: 'Pemasok', href: '/suppliers', icon: <Truck />, permission: 'suppliers:manage', group: 'katalog' },
  { key: 'inventory', label: 'Stok', href: '/inventory', icon: <Boxes />, permission: 'inventory:read', group: 'operasional' },
  { key: 'purchases', label: 'Pembelian', href: '/purchases', icon: <Package />, permission: 'purchases:view', group: 'operasional' },
  { key: 'sales', label: 'Penjualan', href: '/sales', icon: <ReceiptText />, permission: 'sales:view_own', group: 'operasional' },
  { key: 'expenses', label: 'Pengeluaran', href: '/expenses', icon: <Wallet />, permission: 'expenses:view', group: 'operasional' },
  { key: 'reports', label: 'Laporan', href: '/reports', icon: <BarChart3 />, permission: 'reports:view', group: 'analitik' },
  { key: 'guide', label: 'Panduan', href: '/guide', icon: <CircleHelp />, group: 'sistem' },
  { key: 'users', label: 'Pengguna', href: '/users', icon: <Users />, permission: 'users:manage', group: 'sistem' },
  { key: 'audit', label: 'Log Audit', href: '/audit-logs', icon: <ScrollText />, permission: 'audit:view', group: 'sistem' },
  { key: 'settings', label: 'Pengaturan', href: '/settings', icon: <Settings />, permission: 'settings:manage', group: 'sistem' },
];

export function visibleNav(role: import('@/types/database').AppRole): NavItem[] {
  return NAV_ITEMS.filter((item) => !item.permission || can(role, item.permission));
}

'use client';

import { ChevronsLeft, ChevronsRight, LogOut, Menu } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import { logoutAction } from '@/app/(auth)/login/actions';
import { useUser } from '@/lib/auth/session-context';
import { NAV_GROUPS, visibleNav, type NavItem } from '@/lib/nav';
import { useSensoryUI } from '@/components/ui/sensory-ui';
import type { AppRole } from '@/types/database';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { useBreakpoint } from '@/components/layout/useBreakpoint';

const ROLE_LABELS: Record<AppRole, string> = {
  OWNER: 'Pemilik',
  ADMIN: 'Admin',
  CASHIER: 'Kasir',
};

const SIDEBAR_WIDTH = 232;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const SIDEBAR_STORAGE_KEY = 'bookstore.sidebar.collapsed';

let collapsedListeners: Array<() => void> = [];

function setCollapsedStore(value: boolean) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, value ? '1' : '0');
  } catch {
    // storage unavailable (private mode) — state still works for the session
  }
  for (const l of collapsedListeners) l();
}

function subscribeCollapsed(onChange: () => void) {
  collapsedListeners = [...collapsedListeners, onChange];
  window.addEventListener('storage', onChange); // react to toggles in other tabs
  return () => {
    collapsedListeners = collapsedListeners.filter((l) => l !== onChange);
    window.removeEventListener('storage', onChange);
  };
}

function getCollapsedSnapshot(): boolean {
  try {
    return localStorage.getItem(SIDEBAR_STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

/** Routes prefetched on mount so the first click after load feels instant. */
const PREFETCH_ON_MOUNT = ['/dashboard', '/pos', '/books', '/inventory', '/sales'];

function Brand({ compact }: { compact?: boolean }) {
  return (
    <div className="flex min-h-16 items-center gap-2.5 px-4 py-4">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-[4px] bg-primary text-base font-bold text-primary-foreground">
        B
      </span>
      {!compact && (
        <div className="min-w-0 leading-tight">
          <p className="m-0 text-[15px] font-bold">Bookstore</p>
          <p className="u-label m-0 !text-[9.5px]">POS &amp; Inventori</p>
        </div>
      )}
    </div>
  );
}

/** Sidebar / drawer menu — grouped nav with micro-labels (nefo). */
function NavMenu({
  items,
  selectedKey,
  onNavigate,
  collapsed = false,
}: {
  items: NavItem[];
  selectedKey: string;
  onNavigate: (key: string) => void;
  collapsed?: boolean;
}) {
  const router = useRouter();
  const groups = useMemo(() => {
    const order: (keyof typeof NAV_GROUPS)[] = ['utama', 'katalog', 'operasional', 'analitik', 'sistem'];
    return order
      .map((g) => ({ group: g, label: NAV_GROUPS[g], items: items.filter((i) => i.group === g) }))
      .filter((g) => g.items.length > 0);
  }, [items]);

  return (
    <div className={`nav-scroll${collapsed ? ' collapsed' : ''}`}>
      {groups.map((g) => (
        <div key={g.group} className="nav-group">
          {!collapsed && <span className="nav-group-label">{g.label}</span>}
          {g.items.map((item) => {
            const active = selectedKey === item.key;
            const button = (
              <button
                key={item.key}
                type="button"
                className={`nav-item${collapsed ? ' collapsed' : ''}${active ? ' active' : ''}`}
                onClick={() => onNavigate(item.key)}
                onMouseEnter={() => router.prefetch(item.href)}
                aria-label={item.label}
              >
                {item.icon}
                {!collapsed && <span className="nav-item-label">{item.label}</span>}
              </button>
            );
            return collapsed ? (
              <Tooltip key={item.key}>
                <TooltipTrigger asChild>{button}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            ) : (
              button
            );
          })}
        </div>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const user = useUser();
  const router = useRouter();
  const pathname = usePathname();
  const { isMobile } = useBreakpoint();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Hydration-safe: server + first client render agree on `false`; the stored
  // value is applied by useSyncExternalStore right after hydration.
  const collapsed = useSyncExternalStore(subscribeCollapsed, getCollapsedSnapshot, () => false);
  const { playSound } = useSensoryUI();

  const items = useMemo(() => visibleNav(user.role), [user.role]);
  const selectedItem = useMemo(() => {
    let best: NavItem | undefined;
    for (const item of items) {
      if (pathname === item.href || (pathname.startsWith(item.href) && (!best || item.href.length > best.href.length))) {
        best = item;
      }
    }
    return best;
  }, [items, pathname]);
  const selectedKey = selectedItem?.key ?? 'dashboard';

  // Warm the router cache / dev compilation for the most likely next routes.
  useEffect(() => {
    for (const href of PREFETCH_ON_MOUNT) router.prefetch(href);
  }, [router]);

  const toggleCollapsed = () => {
    setCollapsedStore(!collapsed);
    void playSound('interaction.tap');
  };

  const navigate = (key: string) => {
    const item = items.find((i) => i.key === key);
    if (item) {
      void playSound('navigation.forward');
      router.push(item.href);
    }
    setDrawerOpen(false);
  };

  const initials = (user.fullName || user.email || 'U').trim().charAt(0).toUpperCase();
  const displayName = user.fullName || user.email;

  const UserMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 px-2">
          <Avatar>
            <AvatarFallback>{initials}</AvatarFallback>
          </Avatar>
          <span className="max-w-28 truncate">{displayName}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          variant="destructive"
          onClick={() => {
            void playSound('overlay.close');
            void logoutAction();
          }}
        >
          <LogOut className="size-4" />
          Keluar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );

  if (isMobile) {
    // Primary bar: Dasbor · Buku · POS (center action) · Stok/Penjualan · Menu.
    const byKey = new Map(items.map((i) => [i.key, i]));
    const pick = (key: string) => byKey.get(key);
    const primary = ['dashboard', 'books', 'pos'].map(pick).filter((i): i is NavItem => Boolean(i));
    const fourth = pick('inventory') ?? pick('sales') ?? pick('purchases');
    const barItems = fourth ? [...primary, fourth] : primary;
    return (
      <div className="flex min-h-screen flex-col">
        <header className="app-header flex h-14 items-center justify-between px-2.5">
          <Button variant="ghost" size="icon" onClick={() => setDrawerOpen(true)} aria-label="Buka menu">
            <Menu className="size-5" />
          </Button>
          <span className="text-[15px] font-bold">Bookstore</span>
          {UserMenu}
        </header>
        <main className="flex-1 px-3.5 pb-24 pt-3.5">{children}</main>
        <nav
          className="fixed inset-x-0 bottom-0 z-20 flex items-end border-t border-border bg-background/95 backdrop-blur"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          {barItems.map((item) =>
            item.key === 'pos' ? (
              <button
                key={item.key}
                type="button"
                aria-label="POS"
                className={`bottom-nav-fab${selectedKey === item.key ? ' active' : ''}`}
                onClick={() => navigate('pos')}
                onMouseEnter={() => router.prefetch('/pos')}
              >
                <span className="bn-fab-icon">{item.icon}</span>
                <span className="bn-label">POS</span>
              </button>
            ) : (
              <button
                key={item.key}
                type="button"
                className={`bottom-nav-btn${selectedKey === item.key ? ' active' : ''}`}
                onClick={() => navigate(item.key)}
                onMouseEnter={() => router.prefetch(item.href)}
              >
                <span className="bn-icon">{item.icon}</span>
                <span className="bn-label">{item.label}</span>
              </button>
            ),
          )}
          <button
            type="button"
            className={`bottom-nav-btn${drawerOpen ? ' active' : ''}`}
            onClick={() => setDrawerOpen(true)}
            aria-label="Menu lengkap"
          >
            <span className="bn-icon">
              <Menu className="size-[17px]" />
            </span>
            <span className="bn-label">Menu</span>
          </button>
        </nav>
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent side="bottom" className="max-h-[82dvh] !p-0">
            <SheetHeader className="!p-0">
              <SheetTitle className="sr-only">Menu</SheetTitle>
            </SheetHeader>
            <div className="flex items-center gap-2.5 border-b border-border p-3">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-semibold">{displayName}</p>
                <Badge variant="info" className="mt-0.5">
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
              <Button variant="ghost" size="icon" aria-label="Keluar" onClick={() => void logoutAction()}>
                <LogOut className="size-4" />
              </Button>
            </div>
            <div className="nav-scroll flex-1">
              <NavMenu items={items} selectedKey={selectedKey} onNavigate={navigate} />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <aside
        className="sticky top-0 flex h-screen shrink-0 flex-col overflow-hidden border-r border-border bg-muted/40 transition-[width] duration-200"
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      >
        <Brand compact={collapsed} />
        <NavMenu items={items} selectedKey={selectedKey} onNavigate={navigate} collapsed={collapsed} />
        <div className="border-t border-border bg-card p-3">
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex justify-center">
                  <Avatar>
                    <AvatarFallback>{initials}</AvatarFallback>
                  </Avatar>
                </div>
              </TooltipTrigger>
              <TooltipContent side="right">{displayName}</TooltipContent>
            </Tooltip>
          ) : (
            <div className="flex items-center gap-2.5">
              <Avatar>
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="m-0 truncate text-[13px] font-semibold">{displayName}</p>
                <p className="m-0 text-[11px] text-muted-foreground">{ROLE_LABELS[user.role]}</p>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label="Menu pengguna">
                    <LogOut className="size-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem variant="destructive" onClick={() => void logoutAction()}>
                    <LogOut className="size-4" />
                    Keluar
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="app-header flex h-14 items-center justify-between px-5">
          <div className="flex min-w-0 items-center gap-2.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleCollapsed}
              aria-label={collapsed ? 'Perluas menu' : 'Ciutkan menu'}
            >
              {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            </Button>
            <div className="min-w-0 leading-tight">
              <div className="u-label mb-0.5">{selectedItem ? NAV_GROUPS[selectedItem.group] : 'Aplikasi'}</div>
              <span className="block truncate text-[16px] font-bold">{selectedItem?.label ?? 'Bookstore'}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="info">{ROLE_LABELS[user.role]}</Badge>
            {UserMenu}
          </div>
        </header>
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}

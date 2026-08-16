'use client';

import { createContext, useContext } from 'react';

import { can, type Permission } from '@/lib/permissions/permissions';
import type { AppRole } from '@/types/database';

export interface SessionUser {
  id: string;
  email: string;
  fullName: string;
  role: AppRole;
}

const SessionContext = createContext<SessionUser | null>(null);

export function SessionProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  return <SessionContext.Provider value={user}>{children}</SessionContext.Provider>;
}

export function useUser(): SessionUser {
  const user = useContext(SessionContext);
  if (!user) throw new Error('useUser must be used inside SessionProvider');
  return user;
}

/** Client-side gate (UI convenience only — server enforces via requireRole). */
export function usePermission(permission: Permission): boolean {
  const user = useContext(SessionContext);
  return user ? can(user.role, permission) : false;
}

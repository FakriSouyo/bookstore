'use server';

import { createUser, setUserActive, updateUserRole } from '@/lib/services/users';
import type { AppRole } from '@/types/database';

export async function createUserAction(input: { email: string; full_name: string; role: AppRole }) {
  return createUser(input);
}

export async function updateUserRoleAction(userId: string, role: AppRole) {
  return updateUserRole(userId, role);
}

export async function setUserActiveAction(userId: string, isActive: boolean) {
  return setUserActive(userId, isActive);
}

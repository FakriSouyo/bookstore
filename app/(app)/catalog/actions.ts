'use server';

import {
  createCatalogEntry,
  setCatalogActive,
  updateCatalogEntry,
  type CatalogTable,
} from '@/lib/services/catalog';

export interface CatalogInput {
  name?: string;
  description?: string;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  country?: string;
}

export async function createEntryAction(table: CatalogTable, input: CatalogInput & { name: string }) {
  return createCatalogEntry(table, input);
}

export async function updateEntryAction(table: CatalogTable, id: string, input: CatalogInput) {
  return updateCatalogEntry(table, id, input);
}

export async function setActiveAction(table: CatalogTable, id: string, isActive: boolean) {
  return setCatalogActive(table, id, isActive);
}

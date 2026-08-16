/**
 * Database row types — hand-maintained until a Supabase project exists.
 * Once the schema is deployed, regenerate with:
 *   supabase gen types typescript --local > types/database.ts
 * (see skills/bookstore-supabase/SKILL.md)
 */

export type AppRole = 'OWNER' | 'ADMIN' | 'CASHIER';
export type BookStatus = 'ACTIVE' | 'INACTIVE' | 'ARCHIVED';
export type PurchaseStatus = 'DRAFT' | 'ORDERED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
export type SaleStatus = 'COMPLETED' | 'VOIDED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';
export type PaymentMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'MOBILE_MONEY' | 'OTHER';
export type PaymentStatus = 'PENDING' | 'PARTIAL' | 'PAID' | 'REFUNDED';
export type MovementType =
  | 'PURCHASE' | 'SALE' | 'RETURN_IN' | 'RETURN_OUT'
  | 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS' | 'CORRECTION';
export type ReferenceType = 'PURCHASE_ITEM' | 'SALE_ITEM' | 'ADJUSTMENT' | 'RETURN' | 'CORRECTION';
export type ExpenseCategory = 'RENT' | 'ELECTRICITY' | 'INTERNET' | 'SALARY' | 'TRANSPORTATION' | 'OTHER';

export interface ProfileRow {
  id: string;
  full_name: string;
  role: AppRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookRow {
  id: string;
  isbn: string | null;
  barcode: string | null;
  title: string;
  slug: string;
  author: string;
  description: string | null;
  category_id: string | null;
  publisher_id: string | null;
  publication_year: number | null;
  edition: string | null;
  language: string;
  purchase_price_cents: number;
  selling_price_cents: number;
  stock: number;
  minimum_stock: number;
  location: string | null;
  status: BookStatus;
  created_at: string;
  updated_at: string;
}

export interface BookImageRow {
  id: string;
  book_id: string;
  storage_path: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
  created_at: string;
}

export interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PublisherRow {
  id: string;
  name: string;
  slug: string;
  country: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierRow {
  id: string;
  name: string;
  contact_person: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface PurchaseRow {
  id: string;
  supplier_id: string;
  invoice_number: string;
  purchase_date: string;
  status: PurchaseStatus;
  subtotal_cents: number;
  discount_cents: number;
  shipping_cents: number;
  tax_cents: number;
  total_cents: number;
  payment_status: PaymentStatus;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PurchaseItemRow {
  id: string;
  purchase_id: string;
  book_id: string;
  quantity_ordered: number;
  quantity_received: number;
  unit_cost_cents: number;
  discount_cents: number;
  line_total_cents: number;
}

export interface SaleRow {
  id: string;
  invoice_number: string;
  cashier_id: string;
  status: SaleStatus;
  subtotal_cents: number;
  discount_cents: number;
  tax_cents: number;
  total_cents: number;
  tendered_cents: number;
  change_cents: number;
  payment_method: PaymentMethod;
  notes: string | null;
  void_reason: string | null;
  voided_by: string | null;
  voided_at: string | null;
  refunded_amount_cents: number;
  created_at: string;
  updated_at: string;
}

export interface SaleItemRow {
  id: string;
  sale_id: string;
  book_id: string;
  quantity: number;
  unit_price_cents: number;
  unit_cost_cents: number;
  discount_cents: number;
  line_total_cents: number;
  title_snapshot: string;
  isbn_snapshot: string | null;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  sale_id: string;
  amount_cents: number;
  method: PaymentMethod;
  reference: string | null;
  created_by: string;
  created_at: string;
}

export interface StockMovementRow {
  id: string;
  book_id: string;
  quantity: number;
  movement_type: MovementType;
  reference_type: ReferenceType | null;
  reference_id: string | null;
  previous_stock: number;
  new_stock: number;
  unit_cost_cents: number | null;
  notes: string | null;
  created_by: string | null;
  created_at: string;
}

export interface ExpenseRow {
  id: string;
  category: ExpenseCategory;
  amount_cents: number;
  expense_date: string;
  description: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLogRow {
  id: string;
  user_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface StoreSettingsRow {
  id: number;
  store_name: string;
  store_address: string | null;
  store_phone: string | null;
  receipt_footer: string | null;
  receipt_width: '58' | '80';
  currency: string;
  allow_negative_stock: boolean;
  max_discount_percent: number;
  tax_rate_bps: number;
  updated_by: string | null;
  updated_at: string;
}

export interface DailyCashSessionRow {
  id: string;
  cashier_id: string;
  opened_at: string;
  opened_balance_cents: number;
  closed_at: string | null;
  closed_balance_cents: number | null;
  expected_cents: number | null;
  variance_cents: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

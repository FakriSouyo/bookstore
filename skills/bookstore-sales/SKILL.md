---
name: bookstore-sales
description: Sales module for the Bookstore Management & POS app — sales history, sale detail with timeline, role-scoped visibility, and the void/refund flows that reverse stock through RETURN_IN movements without ever deleting historical transactions.
---

# Purpose

Define the sales module: the historical record of every completed transaction, its detail view, and the rules for voiding and refunding. Historical sales are immutable records — they are status-updated (VOIDED/REFUNDED), never deleted, and any stock reversal is a first-class movement.

# Scope

- Sales list (server-paginated, filters, role-scoped visibility).
- Sale detail (items with snapshots, payment, totals, movement timeline).
- Void flow (permission, reason, confirmation, stock reversal).
- Refund flow (full and partial; stock reversal for returned items).
- Reprinting receipts (delegated to `bookstore-receipt`).

Out of scope: the POS checkout that creates sales (see `bookstore-pos`), the `create_sale`/`void_sale`/`refund_sale` RPC internals (see `bookstore-database`), stock movements (see `bookstore-inventory`), report aggregations (see `bookstore-reports`).

# When to Use

Any change to sales history, sale detail pages, void/refund actions, or sale-related queries. If you touch the sales table's schema or the void/refund RPCs, pair with `bookstore-database` and `bookstore-inventory`.

# Architecture

## Data model (from `bookstore-database`)

- `sales`: header with `invoice_number`, `cashier_id`, status, `subtotal/discount/tax/total/tendered/change` (cents), payment method, void metadata, refunded amount.
- `sale_items`: line items with **snapshots** (`unit_price_cents`, `unit_cost_cents`, `title_snapshot`, `isbn_snapshot`) so history never changes when books/prices are edited later.
- `payments`: payment rows per sale.

Statuses: `COMPLETED` → `VOIDED` | `REFUNDED` | `PARTIALLY_REFUNDED`.

## Role-scoped visibility

- **Cashier** (`sales:view_own`): sees only their own sales (`cashier_id = user.id`), with no cost/profit columns, no void/refund actions.
- **ADMIN/OWNER** (`sales:view_all`): see everything; can void and refund (`sales:void`, `sales:refund`).
- Enforce scoping in the query (`.eq('cashier_id', userId)` when the caller lacks `view_all`), never by filtering in the UI.

## Sales list (`/sales`)

- Server-paginated `ResponsiveTable`. Desktop columns: `Invoice | Date | Cashier | Items | Total | Payment | Status | Actions`. Mobile cards: invoice, date, total, status tag, "More".
- Filters: date range (RangePicker), status, cashier (ADMIN/OWNER only), search by invoice number.
- Row actions: View, Reprint receipt (`receipt:print`), Void/Refund (role + status gated).
- `VOIDED`/`REFUNDED` rows are visually distinct (red tag, strikethrough total) but always present — never filtered out of history.

## Sale detail (`/sales/[id]`)

- `Descriptions` header (invoice, date/time, cashier, payment, status).
- Items table with snapshots (title, ISBN, qty, unit price, line total) — read-only.
- Totals block (subtotal, discount, tax, total, tendered, change) with `Money`.
- Payments list.
- **Timeline** of stock movements for the sale (from `stock_movements` where `reference_id = sale.id`): SALE −qty on checkout, RETURN_IN +qty on void/refund — the movement ledger doubles as the audit trail.
- Actions (gated): Reprint receipt; Void sale; Refund.

## Void flow

1. Action available only on `COMPLETED` sales, to `sales:void` roles.
2. `Modal.confirm` with reason textarea (required), consequence text ("Stock for all N items will be returned to inventory"), and a `danger` confirm button.
3. Call `void_sale(saleId, reason)` RPC:
   - Validates status is `COMPLETED` (`SALE_NOT_VOIDABLE` otherwise).
   - Creates `RETURN_IN` movements (+qty) per item with reference to the sale.
   - Sets `status = 'VOIDED'`, `void_reason`, `voided_by`, `voided_at`.
   - All in one transaction.
4. Success → notification; sale now shows VOIDED; stock restored; audit `sales.void`.
5. Voiding is **irreversible** — a VOIDED sale cannot be un-voided or re-completed. (If a correction is needed, create a new sale; document this rule.)

## Refund flow

1. Available on `COMPLETED` sales (`sales:refund`).
2. Full refund: `refund_sale(saleId, items = all, amount = total, reason)` → all items RETURN_IN, status `REFUNDED`, `refunded_amount_cents = total`, a refund payment row (method = original or OTHER, reference "REFUND").
3. Partial refund: select subset of items (or quantities) → `refund_sale(saleId, items, amount, reason)` → RETURN_IN only for returned quantities, status `PARTIALLY_REFUNDED`, `refunded_amount_cents` accumulates.
4. Refunds never delete the original sale or its items — they append status + movements + a refund payment row.
5. Rules: refund amount ≤ remaining refundable amount; returned quantity ≤ sold quantity; a VOIDED sale cannot be refunded.

# Rules

1. Historical sales are immutable in substance: no editing items/prices/totals; no deletion. All changes are status transitions + new rows (movements, refund payments).
2. Every void/refund creates the corresponding RETURN_IN stock movements — stock is never "silently" restored or left wrong.
3. Void/refund require OWNER/ADMIN (`sales:void`/`sales:refund`) and a mandatory reason.
4. Reports exclude `VOIDED` sales and treat `REFUNDED`/`PARTIALLY_REFUNDED` per refunded amounts (see `bookstore-reports`).
5. Cashiers see their own history only, never costs/profit.
6. Reprinting uses the stored snapshot data, so reprints match the original receipt.

# Implementation Guidance

1. Query pattern for the list (see `bookstore-supabase`): server-paginated `sales` joined with `cashier_id → profiles(full_name)`; items count via a subquery or `sale_items` aggregate.
2. Detail page: one query for sale + items + payments; one for movements (ordered `created_at desc`); render the Timeline from movements.
3. Void/refund actions are server actions calling the RPCs, mapping `SALE_NOT_VOIDABLE`/`SALE_NOT_REFUNDABLE` → `AppError('BUSINESS_RULE')`.
4. After void/refund: `revalidatePath('/sales')` and the affected books' stock displays.

# Security

- RLS on `sales`/`sale_items`/`payments` (see `bookstore-security`): cashier can `SELECT` own rows; writes never come from the client — only via `create_sale`/`void_sale`/`refund_sale` RPCs.
- The RPCs assert roles internally (`assert_role`), so a misconfigured policy cannot allow a cashier to void.
- Cost columns (`unit_cost_cents`) never selected for cashier sessions.
- Void/refund metadata (who, when, why) is always recorded on the row and in `audit_logs`.

# Performance

- List/detail queries hit `sales_created_idx`, `sales_status_idx`, `sales_cashier_idx` (see `bookstore-database`).
- Server-side pagination; totals aggregated in SQL for filters with counts.
- Movements timeline is limited to the sale's movements (indexed by reference).

# Testing

- Unit: refund amount/quantity cap logic (pure part), status-transition validity table.
- Integration:
  - `create_sale` → sale + items + payment + SALE movements; stock correct.
  - `void_sale` → status VOIDED, RETURN_IN movements restore stock exactly, reports exclude it.
  - Full and partial refunds → statuses and `refunded_amount_cents` correct; stock restored only for returned qty.
  - Double-void / refund-after-void → blocked.
  - Cashier cannot void via RPC (`AUTHZ_DENIED`).
- E2E: cashier sees only own sales; admin voids a sale from detail; stock restored on the book page.
- See `bookstore-testing`.

# Common Mistakes

- `DELETE FROM sales WHERE id = …` — destroying history and breaking reports/movements.
- Voiding without stock reversal (or reversing with a hand-written UPDATE instead of the engine).
- Letting cashiers void/refund.
- Editing `sale_items` (snapshots exist precisely so this never happens).
- Not requiring a reason (un-auditable voids).
- Showing cost/profit columns to a cashier who only has `sales:view_own`.
- Forgetting that reports must exclude VOIDED.

# Examples

**Void action:**

```ts
'use server';
export async function voidSale(saleId: string, reason: string) {
  await requireRole('sales:void');
  if (!reason.trim()) throw new AppError('VALIDATION_ERROR', 'A reason is required to void a sale.');
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc('void_sale', { p_sale_id: saleId, p_reason: reason.trim() });
  if (error) throw mapRpcError(error);
  await logAudit('sales.void', saleId, { reason });
  revalidatePath('/sales');
}
```

---
name: bookstore-purchases
description: Purchase module for the Bookstore Management & POS app — the DRAFT → ORDERED → RECEIVED → COMPLETED lifecycle, purchase creation with items, partial receiving, totals calculation, payment status, and cancellation rules. Stock increases ONLY on receiving, via the inventory engine.
---

# Purpose

Define the purchase module: how the store buys stock from suppliers. Purchases track the document (items, costs, invoice, payment) and — critically — **do not affect stock until goods are received**. Receiving is the bridge to the inventory engine.

# Scope

- Purchase lifecycle and status transitions.
- Purchase service and creation form (supplier, items, costs, discounts, shipping, tax, totals).
- Receiving (full and partial) and its stock effects.
- Payment status tracking.
- Cancellation rules.
- Purchase list and detail pages.

Out of scope: the `purchases`/`purchase_items` schema (see `bookstore-database`), the stock engine (see `bookstore-inventory`), supplier CRUD (a simple module following `bookstore-books` conventions — see `bookstore-core` routing).

# When to Use

Any task involving purchase orders: creating, editing, ordering, receiving, cancelling, or viewing purchases; or any screen that displays purchase totals or stock-from-purchase history. When receiving stock, the implementation **must** call `receive_purchase` (the inventory engine), never hand-written updates.

# Architecture

## Lifecycle

```
DRAFT → ORDERED → RECEIVED → COMPLETED
            ↘ CANCELLED (from DRAFT or ORDERED only)
```

| Transition | Who | Effect |
| --- | --- | --- |
| Create | `purchases:create` (ADMIN/OWNER) | Status `DRAFT`; no stock effect. |
| Place order | `purchases:update` | DRAFT → `ORDERED`; freezes items (editing restricted). |
| Receive | `purchases:receive` (ADMIN/OWNER) | `ORDERED` → `RECEIVED`; **stock increases** via `receive_purchase` (PURCHASE movements with cost basis). |
| Complete | `purchases:update` | `RECEIVED` → `COMPLETED`; marks payment settled (`payment_status = 'PAID'`); document is closed. |
| Cancel | `purchases:update` | `DRAFT`/`ORDERED` → `CANCELLED`; no stock effect; reason required. |

Rules:
- A purchase that was partially received cannot be cancelled — receive the rest, then complete.
- `CANCELLED` purchases never affect stock.
- Editing items is allowed in `DRAFT`; from `ORDERED` on, only quantities-received, payment status, and notes may change (protects the document trail).

## Creation form (`/purchases/new`)

Sections: **Supplier & invoice** (supplier Select, invoice number, purchase date), **Items** (dynamic rows: book search → quantity ordered, unit cost, discount), **Totals** (computed), **Notes**.

Totals (computed in `lib/pricing`, re-validated server-side — never trust the client):

```
subtotal_cents  = Σ (unit_cost_cents × quantity_ordered) − Σ line discounts
total_cents     = subtotal − discount_cents + shipping_cents + tax_cents
```

Tax: from `store_settings.tax_rate_bps` (default 0); applied to the discounted subtotal when enabled. The `purchases_total_ok` DB check enforces the sum invariants.

Item picker reuses the book search service (`bookstore-books`) and shows current stock for reference; duplicates of the same book are merged with a warning.

## Receiving (`/purchases/[id]` → Receive)

- On `RECEIVED`-capable purchases, a "Receive stock" action opens the receiving screen.
- **Partial receiving**: each item has `quantity_received`; the screen shows ordered/received/remaining and lets the admin receive the remaining quantity in one action (the engine adds `quantity_ordered − quantity_received`). Partial-per-item UI is optional; the database supports it (`quantity_received ≤ quantity_ordered`).
- Submit calls `receive_purchase(purchase_id)`:
  - Creates one `PURCHASE` movement per item (+qty, `unit_cost_cents`, reference `PURCHASE_ITEM`).
  - Updates `quantity_received`, sets status `RECEIVED`.
  - Runs in one transaction; on any failure nothing changes (stock or status).
- After receiving: success notification with the number of units added; audit `purchases.receive`.
- Stock is NEVER increased at purchase creation or ordering — only here.

## Payment tracking

- `payment_status`: `PENDING` → `PARTIAL` → `PAID` (or back to `PENDING` by correction). Settled on Complete or via an explicit "Record payment" action (ADMIN/OWNER). No AP ledger is maintained — payment status is tracking, not accounting (documented assumption in `bookstore-core`).

## List and detail

- List (`/purchases`): server-paginated `ResponsiveTable`; desktop columns `Invoice | Supplier | Date | Status | Total | Payment | Actions`; mobile cards show invoice, supplier, date, status tag, total, "More". Filters: status, supplier, date range, search (invoice/supplier).
- Detail (`/purchases/[id]`): `Descriptions` (supplier, invoice, dates, status timeline via `Steps`/`Timeline`) + items table (ordered/received/unit cost/line total) + totals block + actions (Edit/Order/Receive/Complete/Cancel/Payment) gated by status and permission.

# Rules

1. Creating or ordering a purchase never changes stock. Stock increases only through `receive_purchase`.
2. Only ADMIN/OWNER create, receive, or cancel purchases (`purchases:create`/`purchases:update`/`purchases:receive`). Cashiers cannot see costs (purchase price visibility is role-gated at query level).
3. Totals are computed and validated server-side; the database check constraint is the backstop.
4. Historical purchases are never edited or deleted — they are status-updated only (cancel/complete).
5. Receiving is atomic: stock + status update together or not at all.
6. Cost basis on the PURCHASE movement comes from `unit_cost_cents` at receive time; later price edits don't rewrite history.

# Implementation Guidance

1. Create purchase: server action validates (`purchaseCreateSchema`), computes totals via `lib/pricing`, inserts `purchases` + `purchase_items` in one transaction (via a service using the server client or a small RPC; a client-side multi-insert is unacceptable).
2. Receive: call `supabase.rpc('receive_purchase', { p_purchase_id })`; map `PURCHASE_NOT_RECEIVABLE` → `AppError('BUSINESS_RULE', ...)`.
3. Complete: `UPDATE purchases SET status='COMPLETED', payment_status='PAID'` — gated by current status (service check) + `purchases:update`.
4. Cancel: same, with required `notes` reason; blocked when `quantity_received > 0`.
5. Revalidate `/purchases` and the book's stock displays after receive.

# Security

- RLS: OWNER/ADMIN read and write purchases; cashiers have no access to `purchases`/`purchase_items` (see `bookstore-security`).
- `receive_purchase` checks `assert_role(['OWNER','ADMIN'])` inside the function; RLS is the outer gate.
- Cost data (`unit_cost_cents`) is never selected for cashier sessions.
- All lifecycle transitions are audit-logged (`purchases.create`, `purchases.order`, `purchases.receive`, `purchases.complete`, `purchases.cancel`) with before/after status in metadata.

# Performance

- List and detail queries hit the indexes in `bookstore-database` (`purchases_supplier_idx`, `purchases_status_idx`, `purchases_date_idx`).
- Server-side pagination; totals aggregated in SQL.
- The receive action is one RPC call regardless of item count.

# Testing

- Unit (`lib/pricing`): subtotal/discount/shipping/tax/total math; rounding is integer (cents) — no float drift.
- Integration:
  - Create DRAFT → no movements, stock unchanged.
  - Receive → stock += ordered qty, one movement per item, status `RECEIVED`.
  - Partial receive semantics (engine adds remaining).
  - Receive twice → second call is a no-op or blocked (`PURCHASE_NOT_RECEIVABLE`).
  - Cancel from ORDERED → `CANCELLED`, no stock change; cancel after receive → blocked.
  - Cashier calling `receive_purchase` → `AUTHZ_DENIED`.
- E2E: full flow create → order → receive → stock increases on book page → complete.
- See `bookstore-testing`.

# Common Mistakes

- Adding stock when the purchase is created (the most common inventory bug).
- Trusting client-computed totals.
- Multi-step client writes for purchase + items (partial failure leaves a broken document).
- Allowing edits after ORDERED that rewrite the document.
- Deleting a purchase that was received (history/loss of audit).
- Not mapping RPC errors (`PURCHASE_NOT_RECEIVABLE` shown raw to the user).
- Letting cashiers see unit costs.

# Examples

**Receive action (server):**

```ts
'use server';
export async function receivePurchase(purchaseId: string) {
  await requireRole('purchases:receive');
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc('receive_purchase', { p_purchase_id: purchaseId });
  if (error) throw mapRpcError(error);
  await logAudit('purchases.receive', purchaseId, {});
  revalidatePath('/purchases');
}
```

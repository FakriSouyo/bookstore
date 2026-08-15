---
name: bookstore-inventory
description: The inventory module owns ALL stock logic in the Bookstore Management & POS app — the movement-based model, the record_movement engine, the adjustment UI, stock queries, and the rule that no other module may ever write books.stock. Read this before touching anything that changes stock.
---

# Purpose

Define the inventory module: the single owner of all stock-related business logic. Every unit of stock that enters or leaves the store is a `stock_movements` row, written atomically with the business event. `books.stock` is only a cached convenience column maintained by this module's engine. **No other module — not books, not purchases, not sales, not the POS — may modify `books.stock` directly.**

# Scope

- The movement model (types, references, previous/new stock, cost basis).
- The stock engine functions (`record_movement`, `adjust_inventory`; sale/purchase/void/refund RPCs are defined in `bookstore-database` and call this engine).
- Stock queries (current stock, movements ledger, low/out-of-stock).
- The adjustment UI (`/inventory` + adjustments).
- Negative-stock policy.
- Concurrency and atomicity rules.
- Reorder suggestions (low stock).

Out of scope: purchase receiving and sale checkout flows (they consume this engine; see `bookstore-purchases`, `bookstore-sales`, `bookstore-pos`), schema DDL (see `bookstore-database`), reporting aggregates (see `bookstore-reports`).

# When to Use

Every task that changes stock, reads stock state, or displays the movements ledger: stock adjustments, damage/loss recording, stock queries for POS or lists, low-stock alerts, reorder lists, and **any change to the `stock_movements`/`books.stock` schema or logic**. If you are writing code that changes stock for another module (purchase receive, sale), the correct implementation is to call the engine functions from this module — not to hand-write updates.

# Architecture

## Movement model

Every movement row (`stock_movements`, schema in `bookstore-database`):

| Field | Meaning |
| --- | --- |
| `book_id` | Book whose stock changed |
| `quantity` | Signed: **positive = in, negative = out** (PURCHASE +10, SALE −2) |
| `movement_type` | `PURCHASE`, `SALE`, `RETURN_IN`, `RETURN_OUT`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `DAMAGE`, `LOSS`, `CORRECTION` |
| `reference_type` / `reference_id` | Link to the source document (`PURCHASE_ITEM`, `SALE_ITEM`, `ADJUSTMENT`, `RETURN`, `CORRECTION`) |
| `previous_stock` / `new_stock` | Stock before/after — makes the ledger auditable without joins |
| `unit_cost_cents` | Cost basis at the time of movement (used by profit reporting) |
| `created_by` / `created_at` | Actor and time |

Movement semantics per type:

| Type | Sign | Used by | Notes |
| --- | --- | --- | --- |
| PURCHASE | + | Purchase receive | Cost basis = `unit_cost_cents` |
| SALE | − | Sale checkout | Cost basis = book's purchase price snapshot |
| RETURN_IN | + | Customer return / sale void / refund | Goods back into stock |
| RETURN_OUT | − | Supplier return | Out of stock back to supplier |
| ADJUSTMENT_IN / ADJUSTMENT_OUT | ± | Manual count correction | Requires note + reason |
| DAMAGE / LOSS | − | Damage/loss write-off | Requires note |
| CORRECTION | ± | Fixing an earlier error | Requires note + reference to the corrected movement |

## The engine

`record_movement` (full SQL in `bookstore-database`) is the **only** function that writes `books.stock`:

1. `SELECT ... FOR UPDATE` the book row (serializes concurrent movements on the same book).
2. Compute `new_stock = previous + quantity`.
3. Enforce the negative-stock rule unless `store_settings.allow_negative_stock` is set (OWNER-only).
4. `UPDATE books SET stock = new_stock`.
5. `INSERT` the movement row (same transaction).

Public entry points (all `security definer`, all call `record_movement`):

| Function | Caller permission | Purpose |
| --- | --- | --- |
| `adjust_inventory(book, qty, type, notes)` | OWNER/ADMIN | Manual adjustment (UI below) |
| `create_sale(...)` | OWNER/ADMIN/CASHIER | Sale checkout (owned by `bookstore-sales`/`bookstore-pos`) |
| `receive_purchase(id)` | OWNER/ADMIN | Purchase receive (owned by `bookstore-purchases`) |
| `void_sale(id, reason)` | OWNER/ADMIN | Reverses stock with RETURN_IN |
| `refund_sale(...)` | OWNER/ADMIN | Partial/full refund with RETURN_IN |

Every movement is itself the audit trail for stock — no separate audit row is needed for stock events (see `bookstore-audit`: stock actions are logged via movements; the service additionally logs `inventory.adjust` for the actor's UI trail).

## Stock queries (`lib/inventory/queries.ts`)

- `currentStock(bookId)` — reads `books.stock` (cheap, always in sync via the engine).
- `movementLedger({ bookId?, type?, from, to, page, pageSize })` — server-paginated `stock_movements` ordered `created_at desc`; joins book title and creator name.
- `lowStockList({ threshold? })` — `stock <= minimum_stock` and `status = 'ACTIVE'`, ordered by `stock` asc. Used by the dashboard badge and the inventory page.
- `outOfStockList()` — `stock = 0` and ACTIVE.
- `stockValue()` — sum of `stock * purchase_price_cents` for ACTIVE books (aggregate in SQL, see `v_inventory_value` in `bookstore-database`).
- `bookMovementPreview(bookId, limit)` — last N movements for the book detail page.

## Adjustment UI (`/inventory`)

- Inventory page: search + table of books with stock, minimum, value (OWNER/ADMIN), low-stock filter; toolbar includes "Record adjustment".
- Adjustment flow (modal or dedicated page — mobile: dedicated stacked page):
  1. Pick book (search with stock shown) → shows current stock.
  2. Pick movement type (ADJUSTMENT_IN / ADJUSTMENT_OUT / DAMAGE / LOSS / CORRECTION) — type drives the sign; quantity is always entered as a positive number.
  3. Notes are **required** for DAMAGE/LOSS/CORRECTION and recommended otherwise.
  4. Preview: `current stock → new stock` and the signed delta.
  5. Submit → `adjust_inventory` RPC → success message + movement appears in the ledger.
- Mobile: sticky "Save adjustment" action bar (`bookstore-responsive`).
- Read access: any authenticated user sees stock (POS needs it); adjusting requires `inventory:adjust` (ADMIN/OWNER).

# Rules

1. **Only `record_movement` (or its callers) writes `books.stock`.** Never `UPDATE books SET stock = ...` from app code, migrations-as-hotfix, or the admin panel.
2. Every stock change has exactly one movement row in the same transaction as its business event. No movement without a reason; no silent stock edits.
3. Signed quantities: `+` in, `−` out. The UI never lets a user type a negative quantity; the type defines the direction.
4. Negative stock is forbidden unless `allow_negative_stock` is enabled (OWNER-only); the engine enforces it regardless of client.
5. Adjustments require a note; DAMAGE/LOSS/CORRECTION require a reason and are audited.
6. Never recompute stock from movements for display — `books.stock` is the cache; movements are the audit trail.
7. Cost basis is recorded on movements so profit reports are exact and historical.

# Implementation Guidance

1. Change stock for your module by calling the RPC that this module defines — never by writing your own transaction that touches `books.stock`.
2. Show stock in read-only form everywhere except this module's adjustment UI.
3. For a new movement type: add the enum value in a migration (`bookstore-database`), update the type mapping in `types/`, extend the adjustment UI options, and document the semantics here.
4. Concurrency: all engines lock book rows `FOR UPDATE`; when a transaction touches multiple books (sale), lock them ordered by `book_id` to avoid deadlocks (see `create_sale` in `bookstore-database`).

# Security

- `adjust_inventory` enforces OWNER/ADMIN inside the function (defense in depth; RLS alone is not enough because `security definer` functions run with the function owner's rights — the explicit check is mandatory).
- The direct `books` table is RLS-protected: no role can `UPDATE books.stock` via the API (policy only allows the columns/rows per `bookstore-security`); `stock_movements` inserts are not exposed to clients — they only happen through functions.
- Movement data is sensitive (cost basis): cashiers see stock, not `unit_cost_cents`, in queries.
- Audit: `inventory.adjust` audit rows with the same reference as the movement.

# Performance

- `books.stock` cached column keeps lists fast; movements are the write-heavy table — index `(book_id, created_at desc)` and `(reference_type, reference_id)` (see `bookstore-database`).
- Ledger queries are server-paginated; never render thousands of movements.
- Low-stock and stock-value aggregates run in SQL.

# Testing

- Unit (pure logic): sign/direction mapping, movement-to-stock math, threshold helpers.
- Integration (local Supabase, see `bookstore-testing`):
  - PURCHASE +10 then SALE −2 → stock 8, ledger rows with correct previous/new.
  - Negative-stock attempt → `NEGATIVE_STOCK`, no partial writes.
  - `allow_negative_stock` off vs on.
  - Concurrent sales of the last unit → exactly one succeeds (row-lock serialization).
  - Void/refund reverse stock with RETURN_IN and correct references.
  - Adjustments require note; unauthorized role → `AUTHZ_DENIED`.
- E2E: adjustment flow on desktop and mobile (sticky bar).

# Common Mistakes

- Any code path that writes `books.stock` directly (the recurring catastrophic bug).
- Treating `books.stock` as ground truth for audit (it is a cache; movements are truth).
- Letting the UI type negative quantities or trusting client-computed new stock.
- Forgetting `FOR UPDATE` → overselling under concurrency.
- Non-atomic multi-step stock changes (update book, then insert movement; crash → drift).
- Not recording cost basis → profit reports can't be computed for history.
- Allowing cashiers to adjust stock.

# Examples

**Damage write-off (ADMIN) — UI calls the RPC:**

```ts
await supabase.rpc('adjust_inventory', {
  p_book_id: bookId, p_quantity: -1, p_movement_type: 'DAMAGE', p_notes: 'Water damage on shelf C2',
});
// books.stock: 7 → 6; ledger: previous 7 → new 6, type DAMAGE, reference ADJUSTMENT
```

**Ledger preview on book detail:**

```tsx
<MovementTimeline movements={preview} />  // shows +10 PURCHASE, −2 SALE, −1 DAMAGE with dates and actors
```

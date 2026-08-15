---
name: bookstore-audit
description: Audit logging for the Bookstore Management & POS app — the central logAudit helper, what must be logged, structured metadata, the OWNER-only audit viewer, and retention rules. Stock events are additionally self-audited via stock_movements.
---

# Purpose

Define audit logging: a complete, queryable record of important operations (who did what, when, with what metadata) so the owner can review activity and detect mistakes or abuse. Audit data is append-only and never user-editable.

# Scope

- The `audit_logs` table (schema in `bookstore-database`).
- The central `logAudit` helper and where it is called.
- The audit event catalog (actions every module must log).
- The OWNER-only audit viewer (`/audit-logs`).
- Retention, export, and integrity rules.
- Relationship with `stock_movements` (the stock ledger is itself an audit trail).

Out of scope: RLS policies (see `bookstore-security`), per-module logging call sites (their skills specify them; this file is the contract).

# When to Use

Any change that adds or moves an important operation (create/update/delete/void/refund/adjust/settings/role change), or any work on the audit viewer. Before finalizing a feature, check the event catalog below and wire `logAudit` at every matching call site.

# Architecture

## Data model (from `bookstore-database`)

```sql
audit_logs (
  id          uuid primary key,
  user_id     uuid references profiles(id),   -- actor; null for system events
  action      text not null,                  -- e.g. 'books.update'
  entity_type text not null,                  -- 'book' | 'sale' | 'purchase' | ...
  entity_id   text,                           -- uuid of the entity
  metadata    jsonb not null default '{}',    -- structured context (before/after, amounts)
  created_at  timestamptz not null default now()
);
```

## The helper

`lib/audit/log.ts`:

```ts
export async function logAudit(action: AuditAction, entity?: { type: string; id: string }, metadata: JsonObject = {}) {
  const supabase = createSupabaseServerClient();   // actor comes from the session
  const { error } = await supabase.from('audit_logs').insert({
    user_id: (await supabase.auth.getUser()).data.user?.id ?? null,
    action, entity_type: entity?.type ?? null, entity_id: entity?.id ?? null,
    metadata: JSON.stringify(metadata),
  });
  if (error) console.error('[audit] failed to write', action, error);   // never fail the business op
}
```

- Called **after** the business operation succeeds (or with `{ success: false }` metadata when logging failures is useful, e.g., blocked attempts).
- **Never** blocks or fails the main operation — audit write failure is logged, not thrown.
- Metadata is structured JSON: before/after values for status changes, `amount_cents` for money ops, `reason` for voids/refunds/cancellations, `role` for role changes. Never store passwords, tokens, or full card data (none exists in this system — see `bookstore-security`).

## Event catalog (contract)

| Module | Actions |
| --- | --- |
| Auth/users | `users.create`, `users.update`, `users.role_change`, `users.deactivate`, `users.activate`, `auth.login_failed` (optional, rate-limited), `auth.logout` |
| Books | `books.create`, `books.update`, `books.archive`, `books.restore`, `books.image_upload`, `books.image_replace`, `books.image_delete`, `books.image_primary` |
| Inventory | `inventory.adjust` (movements are the detailed ledger; this is the actor/UI trail) |
| Purchases | `purchases.create`, `purchases.order`, `purchases.receive`, `purchases.complete`, `purchases.cancel`, `purchases.payment` |
| Sales | `sales.create` (via POS), `sales.void`, `sales.refund`, `receipt.print` |
| Expenses | `expenses.create`, `expenses.update`, `expenses.delete` |
| Settings | `settings.update` (with changed fields) |
| Reports | `reports.export` (report key + params) |

Actions are `module.verb`; keep the catalog in `types/audit.ts` so call sites are type-checked. Add new actions there, never ad hoc strings.

## Stock movements as audit

`stock_movements` (see `bookstore-inventory`) is a self-contained audit trail: previous/new stock, actor, reference, cost basis. Do **not** duplicate movement details into `audit_logs` — log `inventory.adjust` with the movement reference; the ledger row is the detail. This avoids double-writing and drift.

## Audit viewer (`/audit-logs`, OWNER only)

- Server-paginated `ResponsiveTable`: `Time | User | Action | Entity | Metadata (collapsible JSON) | `. Mobile cards: time, action, user, expand for metadata.
- Filters: user, action type, date range, entity type, free-text search in `metadata` (via `metadata::text ilike` — bounded with pagination).
- Metadata rendered read-only (pretty-printed JSON in a `Collapse`/code block), never editable.
- Export CSV (same route pattern as `bookstore-reports` exports, but OWNER-only).

## Retention and integrity

- **Keep everything** by default (internal system, small volume). Documented decision; do not auto-purge unless the owner explicitly configures retention.
- Audit rows are never updated or deleted through the app. RLS prevents user writes (`bookstore-security`).
- Optionally: a nightly integrity check that compares `audit_logs.count` against expected event counts per day and alerts on drift (defense against tampering at the DB level; note that a DB admin can still alter rows — the RLS + append-only convention is the practical control for this app's threat model).

# Rules

1. Log after success; failures worth knowing (blocked attempts) are logged with `success: false`.
2. Never include secrets (passwords, tokens) in metadata.
3. Keep metadata small and structured; don't dump full row objects.
4. Audit writes must not break the primary operation.
5. Only the OWNER role can read the audit viewer; no role can write audit rows directly (RLS).
6. Don't duplicate what `stock_movements` already records — reference it.
7. New features must consult this catalog before shipping (add their actions here first).

# Implementation Guidance

1. Add new actions to `types/audit.ts` (union type) — this makes call sites auditable by type.
2. Call `logAudit` at the end of each server action after the DB write succeeds (see `bookstore-supabase` examples).
3. For status transitions (purchase cancel, sale void), include `{ from, to, reason }` in metadata.
4. For money events include `amount_cents`; for exports include params.

# Security

- RLS on `audit_logs`: `SELECT` OWNER only; no `INSERT`/`UPDATE`/`DELETE` for any role (only the server action path that writes via a server-side client with elevated rights, or a `security definer` helper — see `bookstore-security` for the exact policy; app code writes through the server session with RLS permitting OWNER inserts or via a dedicated insert function).
- The viewer route requires `requireRole('audit:view')`.
- Audit data is sensitive: it reveals who did what; keep it OWNER-only and never expose via client queries.

# Performance

- Indexes: `(created_at desc)` for the viewer, `(entity_type, entity_id)` for entity lookups (`bookstore-database`).
- Server-side pagination; metadata search is bounded.
- Writes are single-row inserts — negligible; batch not required at this scale.

# Testing

- Unit: `logAudit` metadata serialization, action union coverage.
- Integration: each audited action writes the expected row (spot-check the catalog: create/update book, void sale, adjust inventory, settings update); audit failure doesn't fail the business op; RLS blocks non-OWNER reads and all writes by normal roles.
- E2E: OWNER opens `/audit-logs`, filters by action, sees metadata; a CASHIER gets 403.
- See `bookstore-testing`.

# Common Mistakes

- Logging only "interesting" actions — the catalog is the contract; missing a call site leaves a blind spot.
- Duplicating movement details into audit rows (drift risk).
- Letting audit failures fail the business operation.
- Storing secrets or full payloads in metadata (bloat + risk).
- Giving ADMIN (or worse, cashiers) access to the audit viewer.
- Allowing user-editable audit rows (destroys the trail).

# Examples

**Void sale with audit (see also `bookstore-sales`):**

```ts
await supabase.rpc('void_sale', { p_sale_id: saleId, p_reason: reason });
await logAudit('sales.void', { type: 'sale', id: saleId }, { reason, status: { from: 'COMPLETED', to: 'VOIDED' } });
```

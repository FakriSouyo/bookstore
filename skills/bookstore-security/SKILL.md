---
name: bookstore-security
description: The security model for the Bookstore Management & POS app — Row Level Security policies for every table, the RBAC matrix, storage policies, server-side authorization, input validation, secret handling, and the security review checklist. Read before touching any policy, permission, or critical write path.
---

# Purpose

Define how the application stays secure end-to-end: **Row Level Security as the backstop on every table, RBAC at the service layer, storage policies, server-side validation and authorization, and disciplined key handling.** Frontend checks are convenience; the database and the server enforce.

# Scope

- RLS policies for every table (the authoritative policy inventory).
- The RBAC model (roles, permissions, and where each is enforced).
- Storage bucket policies (`book-covers`).
- Server-side authorization patterns for actions, routes, and RPCs.
- Input validation and injection defense.
- Secret/key handling and environment rules.
- Threat model and security review checklist.

Out of scope: auth flows (see `bookstore-auth`), Supabase client mechanics (see `bookstore-supabase`), schema (see `bookstore-database`).

# When to Use

Every time you add a table, a new mutation, a route handler, a storage operation, or a role-sensitive feature. Before merging any change that touches data, run the review checklist at the end of this file.

# Architecture

## Threat model

Internal app, staff-only users (OWNER/ADMIN/CASHIER), hosted on Supabase. Primary threats:

1. **A cashier (or an external actor with a stolen cashier session) escalating privileges** — mitigated by RLS + RBAC + RPC role checks.
2. **Client tampering** (modified requests sending fake prices/stock/roles) — mitigated by server recomputation and RPC-side validation.
3. **Key leakage** (service-role key in client bundles) — mitigated by environment discipline.
4. **Data leakage via RLS gaps** (table added without policies, or `select` of cost columns) — mitigated by the policy inventory + query discipline.
5. **Abuse of destructive operations** (voids, refunds, deletes) — mitigated by permission gating + confirmation + audit.

## RLS policy inventory

Rules of thumb: enable RLS on every table (`alter table ... enable row level security`); **no `using (true)`** for writes anywhere; cashiers get read-only, scoped rows; ADMIN/OWNER get fuller access; nobody writes audit or movement rows through the API.

| Table | Select | Insert | Update | Delete |
| --- | --- | --- | --- | --- |
| profiles | Own row; OWNER/ADMIN all | — (trigger) | Own row: `full_name`/`phone` only; OWNER/ADMIN: `role`, `is_active` | — |
| categories / publishers / suppliers | Authenticated (POS/list need them) | OWNER/ADMIN | OWNER/ADMIN | OWNER/ADMIN (only `is_active=false` in practice) |
| books | Authenticated (cashiers see sellable data; cost columns excluded below) | OWNER/ADMIN | OWNER/ADMIN | none (archive via status) |
| book_images | Authenticated | OWNER/ADMIN | OWNER/ADMIN (`is_primary`, `sort_order`) | OWNER/ADMIN |
| purchases / purchase_items | OWNER/ADMIN | OWNER/ADMIN | OWNER/ADMIN (status transitions) | none |
| sales | Own sales (cashier) or all (ADMIN/OWNER) | — (only via `create_sale` RPC) | — (only via void/refund RPCs) | none |
| sale_items / payments | Same scope as `sales` | — | — | none |
| stock_movements | Authenticated (stock view) but cost column excluded for cashiers | — (only via RPCs) | — | — |
| expenses | OWNER/ADMIN | OWNER/ADMIN | OWNER/ADMIN | OWNER/ADMIN |
| audit_logs | OWNER only | — (via server-side helper only) | — | — |
| store_settings | OWNER/ADMIN (subset for cashiers: receipt/currency fields only) | — | OWNER only | — |
| daily_cash_sessions | Own sessions / OWNER all | OWNER/ADMIN (open session) | OWNER/ADMIN (close session) | — |

**Column-level protection**: `books.purchase_price_cents`, `stock_movements.unit_cost_cents`, `purchase_items.unit_cost_cents`, `sale_items.unit_cost_cents` are grant-limited so cashier sessions cannot select them (`grant select (id, title, ...) on books to authenticated; revoke select (purchase_price_cents) on books from authenticated;` then grant to a `bookstore_staff` role or use column-level `using` in the RLS policy). Enforce at the query layer too (never select cost columns in cashier paths).

Example policies (authoritative style; adjust to match your RLS setup):

```sql
alter table books enable row level security;

create policy "books_select_all_staff" on books for select to authenticated
  using (true);

create policy "books_write_admins" on books for insert to authenticated
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('OWNER', 'ADMIN')));

create policy "books_update_admins" on books for update to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('OWNER', 'ADMIN')))
  with check (exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('OWNER', 'ADMIN')));
```

```sql
-- sales: cashier sees own rows, no direct writes
create policy "sales_select_own" on sales for select to authenticated
  using (cashier_id = auth.uid() or exists (select 1 from profiles p
         where p.id = auth.uid() and p.role in ('OWNER', 'ADMIN')));
-- no insert/update/delete policies on sales — mutations only via security-definer RPCs
```

```sql
-- audit_logs: OWNER read only, no client writes
create policy "audit_select_owner" on audit_logs for select to authenticated
  using (exists (select 1 from profiles p where p.id = auth.uid() and p.role = 'OWNER'));
```

**Important nuance**: the `security definer` RPCs (`create_sale`, `record_movement`, etc.) run with the function owner's rights and are **not** blocked by RLS — that is why every one of them calls `assert_role(...)` internally. RLS is the gate for direct table access; `assert_role` is the gate for function access. Both are required.

## Storage policies (`book-covers`)

```sql
-- reads: any authenticated user (covers render in POS/lists)
create policy "covers_read" on storage.objects for select to authenticated
  using (bucket_id = 'book-covers');

-- writes: only OWNER/ADMIN, and only into books/{book_id}/ paths
create policy "covers_write_admins" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'book-covers'
    and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('OWNER', 'ADMIN'))
    and (storage.foldername(name))[1] = 'books'
  );

create policy "covers_delete_admins" on storage.objects for delete to authenticated
  using (bucket_id = 'book-covers'
         and exists (select 1 from profiles p where p.id = auth.uid() and p.role in ('OWNER', 'ADMIN')));
```

The bucket is **never** public-writable; reads can stay public if covers are non-sensitive, but authenticated-read is preferred for an internal system.

## RBAC summary

| | OWNER | ADMIN | CASHIER |
| --- | --- | --- | --- |
| POS + own sales + receipts | ✓ | ✓ | ✓ |
| Books, categories, publishers, suppliers | ✓ | ✓ | read |
| Inventory adjust / purchases / expenses | ✓ | ✓ | — |
| Reports / sales history (all) / void / refund | ✓ | ✓ | own history only |
| Users, settings, audit logs | ✓ | — | — |

The full permission matrix lives in `lib/permissions` (see `bookstore-auth`) and is enforced at: (a) server actions/route handlers via `requireRole`, (b) RPCs via `assert_role`, (c) RLS via role checks in policies. All three layers must agree.

## Server-side authorization patterns

- **Server actions / route handlers**: first line `await requireRole('x')` (see `bookstore-auth`). Never rely on hidden UI.
- **Queries**: scope by role (cashier: own sales, no cost columns).
- **RPCs**: `assert_role` inside every `security definer` function.
- **Middleware**: session refresh only; page-level role checks in layouts/pages.

## Input validation and injection

- Every mutation validates with zod at the boundary (`bookstore-supabase`); server recomputes money/stock (see `create_sale` in `bookstore-database`).
- All DB access is parameterized through Supabase clients/RPCs — never string-concatenate user input into SQL.
- Storage paths are generated server-approved (uuid), never derived from user filenames (see `bookstore-image-upload`).
- Errors are mapped to `AppError`; raw DB messages never reach users.

## Key and secret handling

- `SUPABASE_SERVICE_ROLE_KEY` is server-only (`import 'server-only'`), never in `NEXT_PUBLIC_*`, never committed.
- `.env.local` is gitignored; document required vars in `.env.example` with placeholders.
- The anon key is public by design — safe only because RLS closes every table.
- Rotate keys through the Supabase dashboard; after rotation, update env + redeploy (no client impact beyond config).

# Rules

1. **Never bypass RLS** — no `service_role` client for app reads/writes; no `bypassrls` grants.
2. **Never trust the client** for prices, stock, totals, roles, or IDs — recompute/validate server-side.
3. **Never expose keys** — service role in client bundles is a critical incident.
4. Every new table: RLS on, policies written here, and a row in the inventory table above.
5. Every `security definer` function: `set search_path = public, pg_temp` + `assert_role` first.
6. Every new mutation: zod validation + `requireRole` + audit (see `bookstore-audit`).
7. No raw database errors to users; no `alert()`; confirmation for destructive ops.
8. Historical transactions are never deleted — status transitions only.

# Implementation Guidance

1. **New table**: define schema (`bookstore-database`) → enable RLS → add policies to this inventory → verify with a role test (see `bookstore-testing`).
2. **New mutation**: `requireRole` → zod → service → audit → revalidate. Never a raw client insert with business rules.
3. **New RPC**: `security definer`, explicit `set search_path`, `assert_role` at the top, symbolic exceptions (mapped by `mapRpcError`).
4. **Review checklist (run before every data-touching change)**:
   - [ ] RLS enabled on all new tables; policies match the inventory above (no `using(true)` writes).
   - [ ] Cashier cannot select cost columns (column grants + query hygiene).
   - [ ] Every mutation validates input and recomputes money/stock server-side.
   - [ ] No client-only authorization; `requireRole` present in the server entry point.
   - [ ] No `service_role` in client code; no new `NEXT_PUBLIC` secrets.
   - [ ] Storage writes gated by bucket policies; paths generated.
   - [ ] Destructive ops confirm + audit; history never hard-deleted.
   - [ ] Errors mapped to `AppError`; no raw DB/Supabase messages surfaced.

# Security

(Defense in depth summary — the layers: AuthN (Supabase Auth, sessions) → AuthZ (RBAC in code) → Data (RLS + column grants) → Function access (`assert_role` in RPCs) → Storage (bucket policies) → Validation (zod + server recompute) → Integrity (audit + movements).)

# Performance

Security controls have negligible cost here: RLS policies use indexed role lookups (`profiles` PK); `assert_role` is one indexed query; column grants are compile-time. Never optimize by disabling RLS — optimize the queries instead.

# Testing

- **Permission tests** (critical): for each role, assert allowed/denied on representative operations — direct table access via RLS (cashier `select` on `books` OK but not `purchase_price_cents`; cashier `insert` into `sales` fails; non-OWNER read of `audit_logs` fails) and RPC access (cashier calling `void_sale` → `AUTHZ_DENIED`).
- **Storage tests**: anon/unauthorized upload rejected; OWNER upload + delete OK.
- **Validation tests**: fake prices/totals rejected by `create_sale`; invalid payloads → `VALIDATION_ERROR`.
- **Audit tests**: sensitive ops always produce audit rows.
- Run all in CI; see `bookstore-testing`.

# Common Mistakes

- Adding a table and forgetting RLS (anon key = full access — the worst possible bug).
- `using (true)` update/delete policies "for now".
- Using the service-role client for routine reads (silently bypasses all policies).
- Trusting client-sent totals/prices and storing them verbatim.
- Client-only role checks ("the button is hidden").
- Exposing `unit_cost_cents` to cashiers through a list query.
- `security definer` without `search_path` or role check (privilege escalation vector).
- Public-writable storage bucket.
- Storing secrets in committed files or `NEXT_PUBLIC_*`.
- Deleting historical rows to "clean up" instead of status transitions.
- Showing raw `PostgrestError`/SQL errors in the UI.

# Examples

**Verifying a new policy (role test, see `bookstore-testing`):**

```ts
// as CASHIER session
const { data, error } = await supabase.from('books').select('purchase_price_cents');
expect(error).not.toBeNull();                    // column hidden
const { error: ins } = await supabase.from('sales').insert({ ... });
expect(ins).not.toBeNull();                      // no insert policy
const { error: rpcErr } = await supabase.rpc('void_sale', { p_sale_id, p_reason: 'test' });
expect(rpcErr.message).toContain('AUTHZ_DENIED'); // function-level check
```

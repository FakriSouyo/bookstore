# Security Review — F-18

Status: **verified** (code-level review; live Supabase policies must be re-verified after migration is applied to a real project).

Scope: `bookstore-security` checklist applied to the migrations, RPCs, storage, and server actions in this repo.

## 1. Row Level Security

| Check | Status | Evidence |
| --- | --- | --- |
| RLS enabled on every table | ✅ | `alter table ... enable row level security` for all 16 tables in `0002_rls.sql` |
| No table left with default-deny gaps (no policies = deny) | ✅ | Every table has explicit policies; `stock_movements` intentionally has **no** insert/update/delete policy (writes only via RPCs) |
| Sales scoped per cashier (`cashier_id = auth.uid() or is_admin()`) | ✅ | `sales_select`, `sale_items_select`, `payments_select` |
| Catalog/books read for all authenticated staff, write admin-only | ✅ | `*_select ... using (true)`; insert/update/delete gated on `public.is_admin()` |
| Purchases admin-only | ✅ | `purchases_*`, `purchase_items_*` gated on `is_admin()` |
| Audit logs OWNER-only read, append-only insert | ✅ | `audit_select_owner`, `audit_insert_staff`; no update/delete policies |
| Store settings OWNER-only update, staff read | ✅ | `settings_select` (true), `settings_update_owner` |
| No `bypassrls` / no superuser usage | ✅ | Helpers are `security definer` but never grant escalation of roles (they only *read* the caller's own role row) |

## 2. RPCs / Database Functions

| Check | Status | Evidence |
| --- | --- | --- |
| All state-mutating RPCs are `security definer` with explicit `set search_path = public, pg_temp` | ✅ | `0001`, `0003`, `0004` |
| RPCs re-authorize the caller (never rely on RLS alone) | ✅ | `assert_role(array['OWNER','ADMIN'])` in `adjust_inventory`, `create_purchase`; role check in `create_sale`; `is_admin()` in analytics RPCs |
| Client-provided prices are not trusted | ✅ | `create_sale` recomputes price/cost from `books` rows; only book_id + quantity accepted |
| Stock can never go negative unless `allow_negative_stock` is set | ✅ | `record_movement` locks the book row (`for update`) and raises `NEGATIVE_STOCK` |
| Deadlock mitigation (books locked in id order) | ✅ | `create_sale` locks all books ordered by `book_id` before inserting the sale |
| Analytic RPCs are read-only (`stable`) | ✅ | `dashboard_kpis`, `revenue_series`, `top_books` declared `stable` |

## 3. Storage (book-covers bucket)

| Check | Status | Evidence |
| --- | --- | --- |
| Bucket is public only for CDN reads; writes admin-only | ✅ | `covers_write_admins` (insert), `covers_update_admins`, `covers_delete_admins` — all `public.is_admin()` |
| Uploads constrained to `books/{book_id}/` paths | ✅ | `(storage.foldername(name))[1] = 'books'` |
| Safe filenames generated server-side | ✅ | `lib/utils/image.ts` — UUID-based object names; original filenames never used |
| No service role key exposed to the browser | ✅ | `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` absent; grep-verified; `lib/supabase/admin.ts` imports `SUPABASE_SERVICE_ROLE_KEY` (server-only) |

## 4. Server Actions / Middleware

| Check | Status | Evidence |
| --- | --- | --- |
| Protected routes redirect unauthenticated users | ✅ | `middleware.ts` matcher + `updateSession` |
| Role gates re-checked server-side in every action | ✅ | All `app/**/actions.ts` call `requireRole` / permission helpers before mutating |
| Input validation with zod | ✅ | Server actions validate payloads before hitting RPCs |
| Errors sanitized (no raw DB errors to users) | ✅ | `lib/utils/errors.ts` — `AppError` taxonomy; RPC exceptions mapped to friendly messages |

## 5. Known Tradeoffs (documented decisions)

- `audit_logs` insert policy allows any authenticated staff (append-only). Rationale per `bookstore-security`: a cashier action must be logged even when the action itself is a low-privilege op. Risk is limited to log noise, not tampering (no update/delete policies; SELECT is OWNER-only).
- `storage.objects` update policy is scoped by bucket + admin, not by object path prefix. Writes are limited to admins, so path scope on update is not exploitable in practice; noted for tightening if desired.

## 6. Actions before production deploy

1. Run `supabase db push` against a real project, then verify `select * from pg_policies` per table.
2. Seed the first OWNER profile manually (or via a one-off SQL using `supabase.auth.admin`).
3. Confirm bucket policies with `supabase storage` CLI or dashboard.
4. Re-run the checks in section 1–3 against the live project and record results here.

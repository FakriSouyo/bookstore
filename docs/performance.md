# Performance Notes — F-19

Scope: the optimization rules from `bookstore-core` (section 24) applied to the implemented codebase.

## Already in place

| Area | Implementation |
| --- | --- |
| Server-side pagination | All list pages (`books`, `purchases`, `sales`, `expenses`, `inventory`, `audit-logs`, `users`) use `supabase-js` `.range()` + `count: 'exact'`; the browser never receives whole tables |
| Query limiting | `.select()` always lists explicit columns; never `select('*')` in lists |
| Dashboard aggregation | `dashboard_kpis`, `revenue_series`, `top_books` RPCs aggregate in Postgres (`sum`, `group by`, date_trunc) — no frontend reduction of big sets |
| Report aggregation | Reports use SQL aggregation with `where` date range pushed down to the query |
| Indexes | `0001_init.sql` indexes on FKs and hot lookup columns: `books(isbn)`, `books(barcode)`, `books(category_id)`, `books(publisher_id)`, `sales(created_at)`, `sale_items(sale_id)`, `stock_movements(book_id, created_at)`, `purchases(invoice_number)`, `audit_logs(created_at)` etc. |
| POS search | `search_books` (when used) and list queries restrict to `status = 'ACTIVE'` and search with `ilike` on indexed-ish prefix via `%{q}%` — acceptable at this catalog size; see notes |
| Image optimization | Supabase storage URLs served through `next/image`-friendly direct URLs; thumbnails use `?width=` params where supported |
| Receipts | Built from stored snapshots (`sale_items.title_snapshot` etc.) — no join-heavy recomputation on reprint |

## Verified via code inspection

- No `select('*')` on wide tables in list paths.
- No `await` inside React render bodies in server components; all data loading is in `async` pages/actions.
- No client-side `.all()` fetches of unbounded rows.
- `lib/pdf` uses `pdfmake` with a single shared vfs fonts load (module-level), so repeated report downloads don't re-read fonts per request.

## Recommended next steps (when catalog/transactions grow)

1. **Postgres full-text search** — replace `ilike '%q%'` on `books` with `to_tsvector('simple', title || ' ' || coalesce(isbn,''))` + `ts_rank` ordering; add a generated column + GIN index. This is the single biggest win for POS scan speed.
2. **Tighen RPCs** — `create_sale` currently loops `jsonb_array_elements` twice (lock pass + insert pass). At >50 line items, switch to a single pass with `ORDER BY` in one CTE, or use a temp table.
3. **Report caching** — for date ranges spanning months, cache aggregates in a `report_cache` table keyed by (report, from, to) with a TTL, refreshed by the same RPCs. Do not compute on every page load.
4. **Next.js caching** — add `unstable_cache`/`revalidate` tags to dashboard + reports pages so Supabase hits are deduplicated across requests.
5. **Pagination depth** — beyond ~50k stock_movements rows, switch movements ledger to keyset pagination (`where created_at < last_seen order by created_at desc limit N`) instead of offset.

## Measure, don't guess

- Run `explain analyze` on the four RPCs (`create_sale`, `receive_purchase`, `dashboard_kpis`, top-book queries) after seeding realistic data; verify index usage.
- Add `pg_stat_statements` top-query review in Supabase dashboard before scaling.
- Only add caching after measuring; the current dataset (single store, tens of thousands of rows) is comfortably served by the indexes already defined.

---
feature: F-19
name: Performance Optimization
status: done
skills: [bookstore-core, bookstore-supabase]
---

# Design

## Principle
Per `bookstore-core` section 24: push work into Postgres, keep the browser payload small, index what you query, and measure before adding caching.

## Verified-by-inspection inventory

| Area | Pattern |
| --- | --- |
| List pages | `supabase.from(...).select(cols).range(from, to)` + `count: 'exact'` — pagination component drives `page`/`pageSize` |
| Dashboard | `dashboard_kpis`, `revenue_series`, `top_books` — `sum`/`date_trunc`/`group by` in SQL |
| Reports | `lib/reports` queries aggregate with date/category filters pushed into the `where` clause |
| Indexes | `books(isbn)`, `books(barcode)`, `books(category_id)`, `books(publisher_id)`, `sales(cashier_id, created_at)`, `sale_items(sale_id)`, `purchase_items(purchase_id)`, `stock_movements(book_id, created_at)`, `audit_logs(created_at)`, `expenses(date)` |
| PDF | module-level vfs fonts load — fonts parsed once per process |

## Next steps (conditional, measured)
1. Postgres FTS (generated `tsvector` column + GIN index) replacing `ilike '%q%'` for POS search — the biggest win for scan speed.
2. Single-pass `create_sale` when >50 line items.
3. `unstable_cache`/revalidate tags on dashboard + reports pages.
4. Keyset pagination for the movements ledger beyond ~50k rows.

## Deliverables
- `docs/performance.md` — the full notes.

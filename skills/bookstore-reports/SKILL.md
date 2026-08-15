---
name: bookstore-reports
description: Reports module for the Bookstore Management & POS app — server-side SQL aggregation for all reports, date/filter conventions, profit definitions, CSV/Excel export, and the dashboard KPIs. Charts render only data this module produces.
---

# Purpose

Define the reports module: every analytical query in the app — dashboard KPIs, sales/purchase/inventory/profit reports, best/slow movers, low stock, expenses, cashier performance. **Aggregation happens in the database, never by pulling whole tables into the browser.** Reports share one query architecture so the dashboard, report pages, and exports always agree.

# Scope

- The report registry (one definition per report: query + params + output shape).
- Aggregation conventions (SQL, time bucketing, exclusion rules).
- Profit definition and cost snapshot integrity.
- Date/filter conventions shared by all reports.
- Exports (CSV, Excel) and PDF hand-off.
- Dashboard KPIs and charts.

Out of scope: PDF layout (see `bookstore-pdf`), receipt printing (see `bookstore-receipt`), chart component styling (see `bookstore-ui`).

# When to Use

Any task involving numbers derived from transactions: dashboard KPIs, any report page, export buttons, profit calculations, or "top/bottom" lists. If a new metric is needed, add it to the report registry here rather than writing an ad hoc query in a component.

# Architecture

## Report registry

`lib/reports/index.ts` exports typed report definitions:

```ts
type ReportDef = {
  key: string;
  label: string;
  params: z.ZodSchema;                       // validated at the API/page boundary
  run: (ctx: ReportContext, params: any) => Promise<ReportResult>;  // server-side SQL
};
export const REPORTS: Record<ReportKey, ReportDef> = { ... };
```

Every report is a function that builds a Supabase query (or calls a view/RPC) with parameterized filters and returns a serializable result. Pages, exports, and the dashboard all call `REPORTS[key].run(...)` — one implementation, many surfaces.

## Required reports

| Report | Aggregation | Notes |
| --- | --- | --- |
| Daily sales | `date(created_at)`, sum totals | Excludes VOIDED |
| Monthly sales | `date_trunc('month', created_at)` | Same |
| Custom-range sales | Params from/to | Same, by day |
| Purchases | By day/week or by supplier | Status-filtered (exclude CANCELLED) |
| Inventory | Current snapshot | Stock, value, per category |
| Stock movement | Movements by type/date/book | Signed quantities |
| Profit | Per day/period | See profit definition |
| Best selling books | Top N by qty/revenue | `sale_items` join |
| Slow moving books | Bottom movers over period | `sale_items` grouped |
| Low stock | `stock <= minimum_stock` | Live snapshot |
| Out of stock | `stock = 0` | Live snapshot |
| Expenses | Sum by category / period | `expenses` |
| Cashier performance | Per cashier: sales, items, revenue, avg ticket | `sales` grouped by `cashier_id` |

## Profit definition

- **Gross profit (sales)** = Σ `(unit_price_cents − unit_cost_cents) × quantity` from `sale_items` — exact per sale because both values are **snapshots at sale time** (`bookstore-database`). Never join `books` for historical profit.
- **Net profit** = gross profit − expenses (for the same period) when the report asks for net.
- Refunds/voids: VOIDED sales excluded; REFUNDED/PARTIALLY_REFUNDED subtract refunded amounts (`refunded_amount_cents`) — computed in SQL, not in JS.

## Aggregation conventions

- Time bucketing in SQL: `date_trunc('day'|'month', created_at)`; local-time bucketing: cast `created_at at time zone store_tz` (store timezone assumption documented in `store_settings` notes; default to server timezone and document).
- Filters (all reports): `date_from`, `date_to` (inclusive), plus category/supplier/publisher/cashier where relevant — applied in SQL.
- Money results are integers (cents) end-to-end; charts format via `formatMoney` (never float math).
- Every report is server-paginated or intentionally bounded (top-N with `LIMIT`); the dashboard is one aggregated query, not a client loop.

## Exports

- **CSV**: route `GET /api/reports/[key]/export?format=csv` — server runs the report, streams a CSV with the same columns the page shows (UTF-8 with BOM for Excel compatibility).
- **Excel**: same route with `format=xlsx` via `exceljs` (server-side only).
- **PDF**: same route with `format=pdf` → delegates to `bookstore-pdf` with the report's data + title/date range.
- All exports require `reports:view` and are audit-logged (`reports.export`).

## Dashboard

`app/(app)/dashboard/page.tsx` (server component) runs the KPI query set (see below) and passes data to chart components.

KPIs (top row, `KpiCard`): Today's revenue, Today's transactions, Today's items sold, Today's profit, Today's purchases, Current stock value, Low stock count, Out-of-stock count.

Charts (via `@ant-design/plots`, lazy-loaded):
- Revenue over time (area/line, 30 days).
- Sales vs purchases over time (dual line or two cards).
- Profit over time (line).
- Top selling books (horizontal bar, top 10).
- Sales by category (donut).

KPI queries are single SQL aggregates (views `v_daily_sales`, `v_inventory_value` in `bookstore-database` plus per-KPI queries). Do not overload: the dashboard shows the 8 KPIs and 5 charts max.

# Rules

1. All aggregation is in SQL. No `SELECT` of whole tables + client-side reduce.
2. One report implementation per metric; dashboard and exports reuse the registry.
3. Historical profit uses `sale_items` snapshots, never current `books` prices.
4. VOIDED sales excluded everywhere; refunds subtract `refunded_amount_cents`.
5. Money stays in integer cents until formatting.
6. Report parameters are validated (zod) at the page/API boundary; date ranges are bounded (e.g., max 366 days per export request) to keep queries fast.
7. Only `reports:view` roles access report pages and exports.

# Implementation Guidance

1. Write the SQL (view or RPC) in a migration (`bookstore-database`) when it's complex; otherwise build a typed Supabase query in the report def.
2. Add the report def to `REPORTS`, the route to `/reports`, and a chart/KPI to the dashboard only if it's actionable — resist dashboard bloat.
3. Report page UI: date `RangePicker` + filters + a table (or chart card) + Export dropdown (CSV/XLSX/PDF). Mobile: stacked filters above a compact chart or table (`bookstore-responsive`).
4. Exports run server-side with a loading state on the button; large exports stream to the response.

# Security

- `reports:view` (ADMIN/OWNER) only. Cashiers have no report access.
- Export route handlers call `requireRole('reports:view')` before running queries.
- Reports contain cost/profit data — the RLS on `sale_items`/`purchases` already blocks cashiers, and the report layer adds the role gate on top.
- Parameterized queries only (no string interpolation into SQL).

# Performance

- Views + indexes (see `bookstore-database`) make period aggregates index-friendly (`sales_created_idx`, `expenses_date_idx`, `movements_created_idx`).
- Top-N lists use `LIMIT` with an ordered index scan.
- Dashboard queries are a handful of cheap aggregates; cache per-minute with `unstable_cache` if the DB load demands it (document the choice).
- Exports: stream rows; never build a giant in-memory array for CSV.

# Testing

- Unit: profit math from snapshots, refund subtraction, bucketing helpers, date-range bounding.
- Integration (against a seeded local DB with known transactions): each report returns expected numbers — daily revenue, profit, best sellers order, low-stock list, cashier totals; VOIDED excluded; partial refund reduces revenue/profit correctly.
- E2E: dashboard loads with real numbers; a report exports CSV that opens in a spreadsheet with matching totals.
- See `bookstore-testing`.

# Common Mistakes

- Client-side aggregation over fetched tables (slow, and wrong on pagination).
- Joining `books` for historical profit (history mutates when prices change).
- Including VOIDED sales in revenue.
- Float money math in charts/aggregates.
- Unbounded date ranges in exports (slow queries).
- New metrics implemented as one-off queries in components instead of the registry (dashboard and reports drift apart).
- Dashboard overload (12 charts nobody reads).

# Examples

**Daily sales KPI (SQL via Supabase):**

```ts
const from = startOfDayUtc(); // params
const { data } = await supabase
  .rpc('dashboard_kpis', { p_from: from.toISOString(), p_to: now.toISOString() });
// returns revenue_cents, transactions, items_sold, profit_cents, purchases_cents,
// stock_value_cents, low_stock_count, out_of_stock_count — one aggregate call
```

**Top sellers:**

```ts
const { data } = await supabase
  .from('sale_items')
  .select('book_id, title_snapshot, quantity, unit_price_cents')
  .gte('created_at', from).lt('created_at', to)
  .order('quantity', { ascending: false })
  .limit(10);
```

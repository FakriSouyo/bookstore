# Implementation Summary — F-02 … F-16

Features F-02 through F-16 were executed as one continuous implementation pass (backlog-driven, following the owning skills). This file is the close-out record for that pass. Each row names the feature, its owning skills, and the primary artifacts delivered.

| ID | Feature | Owning skills | Primary artifacts |
| --- | --- | --- | --- |
| F-02 | Supabase Database | bookstore-database, bookstore-supabase | `.env.example`, `middleware.ts`, `lib/supabase/{middleware,server,browser,admin,storage}.ts`, `supabase/migrations/0001_init.sql` (schema: 16 tables, enums, indexes, triggers, `record_movement`, `adjust_inventory`, `create_sale`, `void_sale`, `refund_sale`, `receive_purchase`, helpers), `0002_rls.sql` (RLS + storage policies), `0003_create_purchase_rpc.sql`, `0004_rpc_analytics.sql`, `types/database.ts` |
| F-03 | Auth & Roles | bookstore-auth, bookstore-security | `lib/permissions/permissions.ts` (matrix), `lib/auth/{guards,session-context}.tsx`, `app/(auth)/{login,forgot-password,reset-password}/` + server actions |
| F-04 | UI Shell | bookstore-ui, bookstore-responsive | `components/layout/AppShell.tsx` (sidebar/header/bottom-nav), `app/(app)/layout.tsx`, `components/tables/ResponsiveTable.tsx`, `useBreakpoint`, shared components (`Money`, `StatusTag`, `EmptyState`, `PageHeader`, `KpiCard`) |
| F-05 | Categories / Publishers / Suppliers | bookstore-books, bookstore-ui | `lib/services/catalog.ts`, `app/(app)/catalog/actions.ts`, `components/catalog/CatalogManager.tsx`, pages `categories`/`publishers`/`suppliers` |
| F-06 | Books | bookstore-books, bookstore-ui, bookstore-responsive | `lib/services/books.ts`, `app/(app)/books/{actions,page,new,[id]}` , `components/books/{BookForm,BookFilters,BookRowActions}`, `lib/utils/{isbn,slug,image}.ts` |
| F-07 | Book Image Upload | bookstore-image-upload, bookstore-supabase, bookstore-security | `lib/supabase/storage.ts`, `components/upload/BookImageManager.tsx`, bucket policies in `0002_rls.sql`, `set_primary_book_image` RPC |
| F-08 | Inventory | bookstore-inventory, bookstore-database | `lib/inventory/queries.ts`, `app/(app)/inventory/{actions,page}`, `components/inventory/{AdjustStockModal,AdjustStockButton}`, movements ledger + low/out-of-stock |
| F-09 | Purchases | bookstore-purchases, bookstore-inventory | `lib/services/purchases.ts`, `app/(app)/purchases/{actions,page,new,[id]}`, `components/purchases/{PurchaseForm,PurchaseActions}`, `create_purchase` + `receive_purchase` RPCs |
| F-10 | POS | bookstore-pos, bookstore-sales, bookstore-inventory | `app/(app)/pos/{actions,page}`, `components/pos/PosClient.tsx` (cart, search, barcode, qty, discount, payment modal, change), checkout via `create_sale` |
| F-11 | Sales History | bookstore-sales, bookstore-inventory | `lib/services/sales.ts`, `app/(app)/sales/{actions,page,[id]}`, `components/sales/SaleActions.tsx`, void/refund via RPCs |
| F-12 | Expenses | bookstore-expenses, bookstore-ui | `lib/services/expenses.ts`, `app/(app)/expenses/{actions,page}`, `components/expenses/ExpenseManager.tsx` |
| F-13 | Dashboard | bookstore-reports, bookstore-ui | `app/(app)/dashboard/page.tsx`, `components/dashboard/DashboardCharts.tsx` (Ant Design Plots), `dashboard_kpis`/`revenue_series`/`top_books` RPCs |
| F-14 | Reports | bookstore-reports, bookstore-supabase | `lib/reports/{index,export}.ts` (registry + CSV/XLSX), `app/(app)/reports/{page,[key]}`, `app/api/reports/[key]/export/route.ts` |
| F-15 | PDF & Receipt | bookstore-pdf, bookstore-receipt | `lib/pdf/{document,theme,headerFooter,tables,reports,receipt}.ts`, `app/api/receipts/[saleId]/pdf/route.ts`, `lib/receipt/{types,build}.ts`, `components/receipt/{ReceiptPrint,ReceiptModal}.tsx` |
| F-16 | Audit Logs | bookstore-audit | `lib/audit/log.ts` (`logAudit`), `app/(app)/audit-logs/page.tsx`, audit insert trigger in `0001_init.sql` |

Cross-cutting (F-02…F-16):

- **Shared business libs**: `lib/pricing/pricing.ts` (totals/discount/change), `lib/utils/{money,format,errors}.ts`, `lib/receipt/*`.
- **Users & Settings**: `lib/services/{users,settings}.ts`, `app/(app)/users/*`, `app/(app)/settings/*` (OWNER-only).
- **Verification at checkpoints**: `npm run typecheck` run after each cluster of pages; errors fixed as they appeared (typed casts, generic inference on paginated queries, responsive table props).

Close-out notes:

- F-17 (Testing), F-18 (Security Review), F-19 (Performance) each have their own feature package with SPEC/DESIGN/TASKS in `features/017-testing/`, `features/018-security-review/`, `features/019-performance/`.
- The one item **not** verifiable without a live project: running the migrations against real Supabase. Everything else (typecheck, lint, build, 39 unit tests) is green.

## Final hardening pass (F-17…F-19 verification)

Closing the backlog surfaced and fixed three cross-cutting issues:

1. **RSC ↔ antd split.** antd v5 executes `createContext` at module scope, which fails in Server Components — the production build broke on every `(app)` page that imported antd directly. Fixed by splitting each page into a thin RSC (permission checks + data fetching) plus a `'use client'` component that owns all antd rendering: `BooksClient`, `BookDetailClient`, `PurchasesClient`, `PurchaseDetailClient`, `SalesClient`, `SaleDetailClient`, `InventoryClient`, `DashboardClient`, `ReportsIndexClient`, `ReportPageClient`, `AuditLogsClient`, plus `components/shared/Panel.tsx` (the only antd `Card` allowed in RSC). `ReprintButton` moved to its own client file. Shared `EmptyState`/`KpiCard` got explicit client directives.
2. **pdfmake typing.** `@types/pdfmake` 0.3.x is broken for common content shapes (it requires `tocItem` on tables). Replaced it with a minimal ambient declaration in `types/pdfmake.d.ts` covering exactly the surface `lib/pdf/*` uses; `Buffer` responses in API routes now pass `new Uint8Array(...)` for `BodyInit` compatibility.
3. **Proxy guard.** `proxy.ts` (Next 16 renamed from `middleware.ts`) now passes requests through when Supabase env vars are absent, so the login page renders during local setup instead of 500ing on every route.

Final verification: `npm run typecheck` ✓ · `npm run lint` ✓ (0 problems) · `npm run build` ✓ (22 routes) · `npm run test` ✓ (39/39) · smoke test: `/login` 200 with theme applied, `/` redirects to `/dashboard`.

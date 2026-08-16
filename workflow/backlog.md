# Feature Backlog

Ordered by dependency (the 19 phases defined in `bookstore-core`). Status: `backlog | active | done`. One feature at a time; update this file when a feature starts and closes.

| ID | Feature | Phase | Owning skills | Depends on | Status |
| --- | --- | --- | --- | --- | --- |
| F-01 | Project Foundation (Next.js + TS strict + AntD theme + Tailwind + lint/typecheck) | 1 | bookstore-core, bookstore-ui | — | done |
| F-02 | Supabase Database (schema, migrations, RPCs, views) | 2 | bookstore-database, bookstore-supabase | F-01 | done |
| F-03 | Authentication & Roles (login, sessions, permissions matrix, RLS baseline) | 3 | bookstore-auth, bookstore-security | F-02 | done |
| F-04 | UI Shell (sidebar, header, breadcrumb, mobile nav, responsive layout) | 4 | bookstore-ui, bookstore-responsive | F-01 | done |
| F-05 | Categories / Publishers / Suppliers | 5 | bookstore-books (conventions), bookstore-ui | F-04 | done |
| F-06 | Books (CRUD, ISBN/barcode, book form, list, detail) | 6 | bookstore-books, bookstore-ui, bookstore-responsive | F-05 | done |
| F-07 | Book Image Upload (storage pipeline, compression, primary image) | 7 | bookstore-image-upload, bookstore-supabase, bookstore-security | F-06 | done |
| F-08 | Inventory (movements, adjustments, ledger, low stock) | 8 | bookstore-inventory, bookstore-database | F-06 | done |
| F-09 | Purchases (lifecycle, receiving, totals) | 9 | bookstore-purchases, bookstore-inventory | F-08, F-05 | done |
| F-10 | POS (cart, search, scanner, payment, checkout) | 10 | bookstore-pos, bookstore-sales, bookstore-inventory | F-08, F-06 | done |
| F-11 | Sales History (list, detail, void, refund) | 11 | bookstore-sales, bookstore-inventory | F-10 | done |
| F-12 | Expenses | 12 | bookstore-expenses, bookstore-ui | F-04 | done |
| F-13 | Dashboard (KPIs, charts) | 13 | bookstore-reports, bookstore-ui | F-10, F-09, F-12 | done |
| F-14 | Reports (registry, aggregation, exports CSV/XLSX) | 14 | bookstore-reports, bookstore-supabase | F-10, F-09, F-12 | done |
| F-15 | PDF & Receipt Printing | 15 | bookstore-pdf, bookstore-receipt | F-11 | done |
| F-16 | Audit Logs (helper, viewer, catalog) | 16 | bookstore-audit | F-03 | done |
| F-17 | Testing (unit/integration/permission/E2E suites) | 17 | bookstore-testing | F-16 | done |
| F-18 | Security Review (RLS audit, checklist) | 18 | bookstore-security | F-17 | done |
| F-19 | Performance Optimization | 19 | bookstore-core, bookstore-supabase | F-18 | done |

Notes:

- F-01 must land before anything else; F-04 (UI shell) can run in parallel with F-02/F-03 only if it doesn't need real data.
- F-17 formalizes tests; modules already carry their tests forward from earlier phases per `bookstore-testing`.
- Reordering requires updating this table and noting the reason.

## All 19 features closed ✅

- **F-02 … F-16** were executed as one implementation pass; close-out record in `docs/implementation-summary.md`.
- **F-17** Vitest suite (39 tests) in `features/017-testing/`.
- **F-18** security checklist in `docs/security-review.md`, package in `features/018-security-review/`.
- **F-19** performance notes in `docs/performance.md`, package in `features/019-performance/`.

Remaining before production: provision a Supabase project, run `supabase db push`, seed the first OWNER profile, verify live policies (see `docs/security-review.md` §6), then point `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `.env.example` and do a live smoke test of login → POS → sale → receipt.

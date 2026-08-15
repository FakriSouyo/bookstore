---
name: bookstore-core
description: Orchestration skill for the internal Bookstore Management & POS system. Read first before any other skill. Defines the architecture, module boundaries, global conventions (money, statuses, permissions, errors, UX states), skill routing table, and the implementation order. All other bookstore-* skills assume the conventions defined here.
---

# Purpose

`bookstore-core` is the entry point and orchestrator for building the internal Bookstore Management & POS application. It defines how the whole system is structured, which module owns what, which conventions every other skill must follow, and which skill to consult for a given task. It is the only skill that describes the full picture; every other skill describes one module in depth.

The application is a **production-oriented internal business system** for a physical bookstore. It is NOT an ecommerce site, and it must never pretend to be one (no customer-facing catalog, no shopping cart for external users, no public pricing pages).

# Scope

- Overall architecture (Next.js App Router + Supabase + Ant Design).
- Domain boundaries and ownership rules.
- The skill routing table (which skill handles which task).
- Global coding, UI, database, and security rules that apply everywhere.
- Canonical conventions shared by all modules (money, enums, permissions, errors, invoice numbering).
- Recommended development order (19 phases).
- Definition of done / quality gates.

Out of scope (handled by other skills): UI implementation (`bookstore-ui`), responsive behavior (`bookstore-responsive`), schema (`bookstore-database`), Supabase mechanics (`bookstore-supabase`), auth (`bookstore-auth`), and every functional module (`bookstore-books` … `bookstore-testing`).

# When to Use

**Always start here.** For any task, first check this skill for ownership and routing, then read the specific skill(s) before writing code.

| Task | Skill(s) to use |
| --- | --- |
| Any UI work: layout, tokens, tables, forms, feedback | `bookstore-ui` (+ `bookstore-responsive` for breakpoints) |
| Any responsive/layout-breakpoint decision | `bookstore-responsive` |
| Schema changes, migrations, DDL, functions, indexes | `bookstore-database` (+ `bookstore-supabase` for how to run them) |
| Supabase client setup, queries, storage, RLS mechanics | `bookstore-supabase` |
| Login/logout/sessions/roles/password reset | `bookstore-auth` |
| Book CRUD, book form, book list, ISBN validation | `bookstore-books` |
| Cover/image upload, replace, delete, primary image | `bookstore-image-upload` |
| **Any** stock change, stock adjustments, stock queries | `bookstore-inventory` |
| Purchases (create, order, receive, cancel) | `bookstore-purchases` |
| POS: cart, search, scanner, payment, receipt trigger | `bookstore-pos` |
| Sales history, sale detail, void, refund | `bookstore-sales` |
| Reports, aggregations, exports | `bookstore-reports` (+ `bookstore-pdf`) |
| PDF generation for reports | `bookstore-pdf` |
| Receipt layout, thermal printing, reprint | `bookstore-receipt` |
| Expenses | `bookstore-expenses` |
| Audit logging | `bookstore-audit` |
| RLS, RBAC, storage security, hardening | `bookstore-security` (+ `bookstore-auth`, `bookstore-supabase`) |
| Any test (unit/integration/permission/E2E) | `bookstore-testing` |

When modifying book CRUD → `bookstore-books`. When uploading a cover → `bookstore-image-upload`. When changing stock → `bookstore-inventory` (never edit stock directly). When creating a purchase → `bookstore-purchases`. When building the POS → `bookstore-pos`. When generating reports → `bookstore-reports` + `bookstore-pdf`. When printing a receipt → `bookstore-receipt`.

# Architecture

## Stack

- **Next.js** (App Router, React Server Components + Server Actions / route handlers), **TypeScript strict** (`strict: true`, no `any`).
- **Supabase**: Postgres, Auth, Storage.
- **Ant Design v5** as the primary UI system (via `ConfigProvider` theme), **Tailwind CSS only** for custom styling that Ant Design cannot express cleanly.
- **@ant-design/plots** (Ant Design Charts) for dashboard/report charts.
- **zod** for input validation at the edges (forms and API boundaries).
- **pdfmake** for server-side PDF generation (reports + receipt PDF fallback).
- **react-to-print** for thermal receipt printing from the browser.
- **Vitest** for unit/integration tests, **Playwright** for E2E (see `bookstore-testing`).

Do not add other major libraries without documenting the reason in the codebase.

## Directory layout

```
app/
├── (auth)/                 # login, forgot-password, reset-password — no shell
├── (app)/                  # protected route group, shared shell (sidebar/header/mobile nav)
│   ├── layout.tsx
│   ├── page.tsx            # redirects to /dashboard
│   ├── dashboard/
│   ├── pos/
│   ├── books/              # list, new, [id]
│   ├── categories/
│   ├── publishers/
│   ├── suppliers/
│   ├── inventory/          # list + adjustments
│   ├── purchases/          # list, new, [id]
│   ├── sales/              # list, [id]
│   ├── expenses/
│   ├── reports/
│   ├── users/
│   ├── audit-logs/
│   └── settings/
components/
├── layout/                 # Sidebar, Header, MobileNav, Shell, Breadcrumbs
├── dashboard/
├── books/
├── inventory/
├── purchases/
├── pos/
├── sales/
├── reports/
├── forms/                  # shared form sections (e.g. money inputs)
├── tables/                 # ResponsiveTable, DataTable, card-list adapters
├── upload/
├── receipt/
└── shared/                 # PageHeader, EmptyState, ErrorState, StatusTag, Money, KpiCard
lib/
├── supabase/               # server.ts, browser.ts, admin.ts, storage.ts
├── auth/                   # session helpers, requireUser/requireRole, permissions hook
├── permissions/            # permission matrix + can() — single source of truth
├── inventory/              # inventory service (owns all stock logic server-side)
├── pricing/                # totals, discounts, change calculation (pure, tested)
├── reports/                # report query definitions + CSV/Excel export
├── pdf/                    # pdfmake factories (reports, receipts)
├── receipt/                # receipt data model + print helpers
├── services/               # books, purchases, sales, expenses, users services
└── utils/                  # money, dates, errors, slug, isbn, format helpers
types/
├── database.ts             # generated Supabase types (supabase gen types)
├── books.ts
├── inventory.ts
├── purchases.ts
├── sales.ts
└── users.ts
supabase/
├── migrations/             # one SQL file per change, chronological
└── seed.sql                # dev-only seed data (never used in production)
```

## Server / client split

- **Server Components** are the default for pages. They query through the server Supabase client (`lib/supabase/server.ts`), which reads the session from cookies.
- **Mutations** go through server actions or route handlers. Every mutation must: validate input (zod), authorize (`requireRole`/`can`), execute via a service, and return a typed result — never raw database errors.
- **Client components** are used only where interactivity is required (POS, forms, tables with client filtering, image upload).
- **Critical writes** (sales, stock movements, purchase receiving) call Postgres RPC functions so the operation is atomic in the database; the client/server layer only prepares and validates data. See `bookstore-database` for the RPC contract and `bookstore-supabase` for calling them.
- **Never** use the service-role client (`lib/supabase/admin.ts`) from a browser bundle; it is server-only. See `bookstore-security`.

## Domain boundaries and ownership

Each module owns its logic; other modules must call its service API instead of reimplementing it.

| Domain | Owner skill | Owns | Must NOT be done elsewhere |
| --- | --- | --- | --- |
| Stock | `bookstore-inventory` | `stock_movements`, `books.stock` (cached value), adjustments, stock queries | Nobody else writes `books.stock`. Sales/purchases call the inventory RPC. |
| Books | `bookstore-books` | book CRUD, ISBN/barcode, status, slug | Image storage is delegated to `bookstore-image-upload`. |
| Purchases | `bookstore-purchases` | purchase lifecycle, receiving | Receiving stock goes through `bookstore-inventory`. |
| Sales | `bookstore-sales` | sale lifecycle, void, refund | Creating a sale's stock effect goes through `bookstore-inventory`. |
| POS | `bookstore-pos` | cart, checkout call, receipt trigger | It calls the sales RPC; it does not reimplement sale logic. |
| Pricing | `lib/pricing` (shared) | totals, discounts, change | POS, sales, purchases, reports all call `lib/pricing`; server re-validates. |
| Reports | `bookstore-reports` | query definitions, aggregation, exports | Charts render only data the reports layer produces. |
| Auth/permissions | `bookstore-auth` | sessions, role checks | All checks go through `lib/permissions`. |
| Images | `bookstore-image-upload` | storage paths, upload/delete, metadata | Books skill only links to image results. |
| Audit | `bookstore-audit` | audit_logs writes/reads | Services call `logAudit()`; nobody writes audit_logs directly except the helper. |

## Canonical conventions (global)

- **Money**: store every amount as integer minor units (cents). Column names end in `_cents`. JS helpers in `lib/utils/money.ts` (`formatMoney`, `fromCents`, `toCents`). Never use floats for money.
- **Statuses and enums** are Postgres enums defined in `bookstore-database`; TypeScript mirrors them in `types/`.
- **Permissions** live only in `lib/permissions`; components call `usePermission()` / `can()`, server code calls `requireRole()`. Never scatter role checks inline.
- **Errors**: use the typed `AppError` (see below). Never surface raw database/Supabase errors to users.
- **UX states**: every list/page/action implements loading, success, error, and empty states, and destructive actions use confirmation. No `alert()`/`confirm()`.
- **No mock data in production code.** Seed data is dev-only (`supabase/seed.sql`). No hardcoded prices, stock, categories, suppliers, or publishers.
- **Dates/times**: store `timestamptz` in Postgres; display in local time via a formatter.
- **IDs**: `uuid` primary keys (`gen_random_uuid()`); human-facing numbers (invoice) are sequences, not PKs.

## Error taxonomy

`lib/utils/errors.ts` defines `AppError` with a stable `code`:

| Code | Meaning | Example |
| --- | --- | --- |
| `VALIDATION_ERROR` | Input failed validation | ISBN invalid, quantity ≤ 0 |
| `AUTH_ERROR` | Not authenticated | No session |
| `AUTHZ_ERROR` | Authenticated but not allowed | Cashier tries to void a sale |
| `NOT_FOUND` | Entity missing | Book id unknown |
| `BUSINESS_RULE` | Operation violates a rule | Selling more than stock |
| `DATABASE_ERROR` | DB failed (mapped, details hidden) | Unique violation on slug |
| `NETWORK_ERROR` | Transport failure | Supabase unreachable |
| `UNEXPECTED` | Anything else | — |

Pattern: client/server throw `AppError`; UI catches and maps code → Ant Design `message.error`/`notification` with a safe message. Raw `PostgrestError`/`PgError` must be wrapped before leaving a service.

# Rules

## Global coding rules

1. TypeScript strict. No `any` (exceptions must be justified and localized).
2. Separate UI / business logic / database / authorization / validation / utilities. Services call the database; components call services; permission checks sit at service or action boundary, never only in JSX.
3. No duplicated business logic. If two places need the same rule (e.g., discount cap), both call the shared function (e.g., `lib/pricing`).
4. No massive components. A component that exceeds ~250 lines should be split.
5. No deeply nested conditionals; early-return.
6. Server-side validation is mandatory for every mutation; client validation is UX only.
7. Never bypass RLS. Never use the service-role key from the browser. Never put it in `NEXT_PUBLIC_*`.
8. Never trust client-provided prices, stock, totals, or discounts. Recompute authoritative values server-side.
9. Never directly mutate stock from the UI. Stock changes only through `bookstore-inventory` RPCs.
10. Never silently delete historical transactions. Sales are VOIDED/REFUNDED, purchases are CANCELLED, books are ARCHIVED (soft delete).
11. Never invent business rules silently. If a rule is ambiguous: identify the ambiguity, choose the safest reasonable default, document the assumption (in code comment + relevant skill), keep it configurable when appropriate. See Assumptions below.
12. Don't fetch entire tables. Server-side pagination for any list that can grow (books, sales, purchases, movements, audit logs).
13. Every important operation logs an audit event (`bookstore-audit`) and shows loading/success/error feedback (`bookstore-ui`).

## Global UI rules

- Ant Design is the default component source; do not recreate existing components.
- Consistent 8px spacing rhythm; subtle borders; minimal shadows; no gratuitous rounded containers (see `bookstore-ui`).
- Mobile is a first-class target, not a shrunken desktop (see `bookstore-responsive`).
- Important numbers (KPIs, totals, change due) are visually prominent via the numeric KPI style.

## Global database rules

- Every mutation that touches multiple tables (sale + items + movements; purchase receive + movements) runs in a single database transaction (RPC). See `bookstore-database`.
- Money columns are integer cents with `CHECK (>= 0)` where applicable.
- Soft delete via status (`ARCHIVED`) rather than hard `DELETE` for books, categories, publishers, suppliers that may be referenced historically.
- Indexes exist for every FK and for the common filters (see `bookstore-database`); query patterns must match them.

## Assumptions (documented defaults)

These are the safe defaults chosen for ambiguous business rules. Each is configurable via `store_settings` where marked.

1. **Single currency**, amounts in integer cents. No multi-currency support (out of scope).
2. **Profit** = `selling_price_cents − purchase_price_cents` at time of sale (snapshot `sale_items.unit_cost_cents` from the book's `purchase_price_cents` when the sale is created). FIFO/weighted-average costing is out of scope; the snapshot column makes the calculation stable for history.
3. **Discounts**: line-level and transaction-level, percentage or fixed amount. A maximum discount percentage is enforced server-side, configured in `store_settings.max_discount_percent` (default 100 — owner lowers it in production).
4. **Tax**: purchases support a tax field but default rate is 0 and tax is off by default (`store_settings.tax_rate_bps = 0`). Keep it configurable; never invent a jurisdiction's tax rules.
5. **Negative stock**: prohibited by default (server + DB `CHECK`). A documented opt-in flag `store_settings.allow_negative_stock` exists for exceptional workflows, but the UI warns and audit still records movements. The flag is OWNER-only.
6. **Returns**: customer returns are `RETURN_IN` movements (goods back to stock); returns to supplier are `RETURN_OUT`. Refunds reverse stock with `RETURN_IN` for the returned quantity.
7. **Purchase receiving**: `purchase_items.quantity_received` supports partial receiving. Stock increases only when goods are received, never at purchase creation.
8. **Sale payment**: POS takes one payment method per transaction (`tendered_cents` / `change_cents` on the sale); the `payments` table supports split/partial payments for future flexibility.
9. **Invoice numbering**: `invoice_number` generated from a dedicated Postgres sequence, formatted `INV-YYYYMMDD-XXXX`.
10. **Book deletion**: books with any stock movement or sale history are never hard-deleted — they are `ARCHIVED`. Hard delete is allowed only for books with zero history and no images, or via an OWNER-only explicit flow with confirmation.
11. **Roles**: three roles only (`OWNER`, `ADMIN`, `CASHIER`); role is a column on `profiles`, not a separate `roles` table (avoid over-normalization; the permission matrix lives in code). A `roles` table is not needed unless dynamic roles are required later.
12. **Images**: book covers live in Supabase Storage bucket `book-covers`, never in Postgres.

# Implementation Guidance

## Starting a task

1. Read this skill (routing table + conventions).
2. Read the owning skill(s) for the module you are touching.
3. Check `bookstore-database` for schema, `bookstore-supabase` for client usage, `bookstore-security` for RLS/authz rules, `bookstore-testing` for what must be tested.
4. Implement in small increments; run typecheck (`npm run typecheck`) and the relevant tests after each meaningful chunk.
5. Follow the UX rules in `bookstore-ui` for every screen you touch.

## Recommended implementation order

Phase 1: Project foundation (Next.js + TS strict + AntD theme + Tailwind + lint).
Phase 2: Supabase database (schema, migrations, RLS, functions) — `bookstore-database`.
Phase 3: Auth and roles — `bookstore-auth` + `bookstore-security`.
Phase 4: UI shell (sidebar, header, mobile nav, responsive) — `bookstore-ui` + `bookstore-responsive`.
Phase 5: Categories / Publishers / Suppliers.
Phase 6: Books — `bookstore-books`.
Phase 7: Book image upload — `bookstore-image-upload`.
Phase 8: Inventory — `bookstore-inventory`.
Phase 9: Purchases — `bookstore-purchases`.
Phase 10: POS — `bookstore-pos`.
Phase 11: Sales history — `bookstore-sales`.
Phase 12: Expenses — `bookstore-expenses`.
Phase 13: Dashboard.
Phase 14: Reports — `bookstore-reports`.
Phase 15: PDF + receipt printing — `bookstore-pdf` + `bookstore-receipt`.
Phase 16: Audit logs — `bookstore-audit`.
Phase 17: Testing — `bookstore-testing`.
Phase 18: Security review — `bookstore-security`.
Phase 19: Performance optimization.

Do not skip phases; each phase depends on the previous. POS (10) and Sales (11) depend on Inventory (8).

## Definition of done

A feature is done when:

- It works end-to-end for all three device classes (mobile / tablet / desktop) per `bookstore-responsive`.
- Loading / success / error / empty states are implemented per `bookstore-ui`.
- Server-side validation and authorization are in place (no client-only checks).
- Stock-affecting operations go through the inventory RPCs.
- Audit logging is present for the operation.
- Typecheck passes and relevant tests (unit/integration/E2E) are added per `bookstore-testing`.
- No `any`, no `alert()`, no raw error leakage, no mock data in production paths.

# Security

See `bookstore-security` for the full model. Minimum invariants every feature must respect:

- RLS is the backstop on every table; the server never runs queries with the service key from a browser context.
- Authorization is enforced server-side in actions/route handlers via `requireRole()`/`can()`.
- Client-supplied money and stock values are treated as untrusted; authoritative values come from the database.
- Destructive operations (void, refund, delete, adjust) require the matching permission and are audit-logged.

# Performance

- Server components for reads; paginate server-side; never `select *` whole tables.
- Indexes must cover the queries (see `bookstore-database`); report queries aggregate in SQL, not in JS.
- Images: upload compressed (WebP), serve via Supabase CDN URLs with sensible cache headers.
- Lazy-load below-the-fold UI; code-split the POS and report pages.

# Testing

Every critical business rule must be covered per `bookstore-testing`. Minimum set (owned by the respective skills):

- Stock calculation and movement rules (`bookstore-inventory`).
- Sale totals, discount caps, change calculation (`lib/pricing`).
- Purchase totals and receive semantics (`bookstore-purchases`).
- Profit calculation and snapshot integrity (`bookstore-reports`).
- Permission matrix (`lib/permissions`).
- RPC atomicity and negative-stock rejection (integration tests).
- POS E2E happy path (add → pay → receipt → stock decremented).

# Common Mistakes

- Reading only one skill and ignoring the conventions (money, RLS, inventory ownership).
- Updating `books.stock` directly anywhere except the inventory RPC.
- Trusting client-side prices/quantities.
- Storing money as floats or as `numeric` returned to JS and compared with `===`.
- Putting role checks only in components (client-only authz).
- Shipping a screen without loading/error/empty states.
- Using mock data in code paths that should hit Supabase.
- Hard-deleting entities that history references.
- Exposing the service-role key or making the anon key able to write (missing RLS).
- Skipping tests for the money/stock logic "because it works in the UI".

# Examples

**Example 1 — "Add a stock adjustment screen".** Start here: routing says stock belongs to `bookstore-inventory`. Read `bookstore-inventory` (movement model + RPC), then `bookstore-ui` (form/table/feedback patterns), `bookstore-responsive` (mobile adjustment layout), `bookstore-security` (who may adjust; RLS on `stock_movements`), `bookstore-testing` (movement tests). Do not touch `bookstore-sales` or `bookstore-purchases`.

**Example 2 — "New sale from POS".** POS skill owns the cart UI and calls the sales RPC; the RPC (defined in `bookstore-database`, enforced via `bookstore-supabase`) validates stock, computes prices server-side, creates `sales`/`sale_items`/`payments`, and records `SALE` movements through the inventory function. After checkout, `bookstore-receipt` prints and `bookstore-audit` logs.

**Example 3 — "Void a sale".** `bookstore-sales` owns the flow: `requireRole('sales:void')`, reason required, confirmation modal, call `void_sale` RPC which reverses stock with `RETURN_IN` movements, updates status to `VOIDED`, and audit-logs. Reports exclude `VOIDED` sales.

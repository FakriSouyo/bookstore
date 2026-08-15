# Bookstore Management & POS — Skill System

Modular, self-contained skill files for building the internal Bookstore Management & POS application (Next.js App Router + TypeScript + Supabase + Ant Design). Each skill is a `SKILL.md` an AI coding agent can follow independently.

## Read order

| Order | Skill | Why |
| --- | --- | --- |
| 1 | `bookstore-core` | Orchestrator — architecture, conventions, routing table, implementation order. **Always start here.** |
| 2 | `bookstore-database` | Full schema, ERD, DDL, RPC functions, migrations. |
| 3 | `bookstore-supabase` | Client architecture, query patterns, storage, types. |
| 4 | `bookstore-auth` | Sessions, roles, the permission matrix. |
| 5 | `bookstore-security` | RLS policy inventory, storage policies, RBAC enforcement. |
| 6 | `bookstore-ui` / `bookstore-responsive` | Visual system + per-device behavior. |
| 7–19 | Module skills | Functional modules (books, inventory, purchases, POS, sales, reports, PDF, receipt, expenses, audit) and `bookstore-testing`. |

## Index

| Skill | Owns |
| --- | --- |
| `bookstore-core` | Orchestration, conventions, skill routing |
| `bookstore-ui` | Design tokens, AntD theming, tables, forms, feedback, states |
| `bookstore-responsive` | Breakpoints, table↔card transformation, mobile nav/POS |
| `bookstore-database` | Schema, enums, indexes, stock engine, RPCs, migrations |
| `bookstore-supabase` | Clients, env vars, queries, RPC calls, storage, types |
| `bookstore-auth` | Auth, sessions, permissions matrix, user management |
| `bookstore-books` | Book CRUD, ISBN/barcode, book form/list |
| `bookstore-image-upload` | Cover pipeline, compression, storage paths, primary image |
| `bookstore-inventory` | **All stock logic** — movements, adjustments, ledger |
| `bookstore-purchases` | Purchase lifecycle, receiving, totals |
| `bookstore-pos` | Cart, search, scanner, payment, checkout |
| `bookstore-sales` | Sales history, void, refund |
| `bookstore-reports` | SQL aggregation, report registry, exports |
| `bookstore-pdf` | Server-side PDF factories (reports + receipt fallback) |
| `bookstore-receipt` | 58/80mm thermal receipts, print CSS, reprint |
| `bookstore-expenses` | Expense CRUD, categories, net profit input |
| `bookstore-audit` | Audit event catalog, `logAudit`, OWNER viewer |
| `bookstore-security` | RLS policy inventory, storage policies, review checklist |
| `bookstore-testing` | Unit/integration/permission/E2E strategy |

## Key global rules (full detail in `bookstore-core`)

- Money is integer cents everywhere (`*_cents`).
- **Only the inventory engine writes `books.stock`** — every stock change is a `stock_movements` row.
- RLS on every table; server-side authorization mandatory; never trust client prices/stock.
- Service-role key is server-only; never in `NEXT_PUBLIC_*`.
- Historical transactions are never deleted — status transitions only.
- No mock data in production paths; seeds are dev-only.
- No `alert()`; loading/empty/error/success states everywhere; mobile is first-class.

## Implementation order

Phases 1–19 are defined in `bookstore-core` (Project foundation → Database → Auth → UI shell → Categories/Suppliers → Books → Images → Inventory → Purchases → POS → Sales → Expenses → Dashboard → Reports → PDF/Receipts → Audit → Testing → Security review → Performance).

---
name: bookstore-testing
description: The testing strategy for the Bookstore Management & POS app — Vitest unit tests for business logic, integration tests against local Supabase (RPCs, RLS, permissions), and Playwright E2E including the POS flow on desktop and mobile. Read before adding any test.
---

# Purpose

Define how the application is tested: a layered strategy covering the critical business logic (stock, money, permissions), the database functions and RLS, and the user flows (especially POS). Tests are the safety net that makes the atomic money/stock rules trustworthy.

# Scope

- Test layers: unit (Vitest), integration (local Supabase), permission/security tests, E2E (Playwright), visual checks.
- Test organization and naming.
- The critical business logic inventory (what must be tested).
- Test data strategy (seeding, isolation, no production data).
- Database/RPC test patterns.
- CI integration and coverage expectations.

Out of scope: implementing business logic (see the module skills), schema (see `bookstore-database`).

# When to Use

Any task that adds or changes business logic, RPC functions, RLS policies, or critical UI flows. Before merging a feature that touches money, stock, or permissions, the relevant tests below must exist and pass. Also read this skill when writing a new test or fixing a flaky one.

# Architecture

## Test layers

| Layer | Tool | Runs against | Covers |
| --- | --- | --- | --- |
| Unit | Vitest | Pure functions (no DB) | `lib/pricing`, `lib/permissions`, ISBN/slug utils, money formatting, receipt data builder, change calc, discount caps, movement math, error mapping |
| Integration | Vitest + Supabase JS client | **Local** Supabase (`supabase start`) | RPCs (`create_sale`, `receive_purchase`, `void_sale`, `refund_sale`, `adjust_inventory`), triggers, constraints, migrations |
| Permission | Vitest + clients per role | Local Supabase | RLS matrix, column grants, storage policies, `assert_role` in RPCs |
| E2E | Playwright | Next.js dev server + local Supabase | POS happy path, CRUD flows, void/refund, receipt print node, login/logout, mobile viewports |
| Visual | Playwright screenshots (optional) | Dev server | Receipt preview at 58/80mm, key screens (golden files) |

## Directory layout

```
tests/
├── unit/                 # pure logic
├── integration/          # DB + RPC (local supabase)
├── permissions/          # RLS/storage role matrix
└── e2e/                  # Playwright
```

Config: `vitest.config.ts` with two projects (`unit` — node, no DB; `integration+permissions` — node with local Supabase env), and `playwright.config.ts` with desktop (`1280×800`) + mobile (`390×844`) projects.

## Critical business logic inventory (must-have tests)

1. **Stock calculation & movements** (`bookstore-inventory`): sign/direction; previous/new stock; ledger invariants; negative-stock rejection; `allow_negative_stock` flag.
2. **Sale calculation** (`bookstore-pos`/`bookstore-sales`): subtotal from snapshots, discount caps, change calculation, tendered-below-total rejection.
3. **Purchase totals** (`bookstore-purchases`): subtotal/discount/shipping/tax/total; integrity constraint.
4. **Profit calculation** (`bookstore-reports`): gross from `sale_items` snapshots; VOIDED exclusion; refund subtraction; net = gross − expenses.
5. **Permission checks** (`bookstore-auth`): full role × permission matrix; scoping (cashier own sales).
6. **Atomicity**: `create_sale` partial failure rolls back sale + items + movements + stock; concurrent oversell (row locks).
7. **ISBN/barcode**: checksums, normalization, uniqueness conflicts.
8. **Receipt builder**: totals/change/status variants; 58 vs 80 width mapping.

## Integration test pattern

Use the Supabase JS client against local Supabase. Two clients per test: **service-role** (arrange/assert) and **per-role** (act as OWNER/ADMIN/CASHIER via `signInWithPassword` against seeded users). Reset state between tests by truncating app tables (never `auth.users` — recreate demo users per run via seed).

```ts
// tests/integration/sales.test.ts
import { beforeAll, afterEach, describe, expect, it } from 'vitest';

beforeAll(async () => { await resetDb(); await seedStaff(); }); // helpers in tests/helpers/db.ts

it('create_sale decrements stock and writes SALE movements atomically', async () => {
  const cashier = await signInAs('cashier@test.local', 'password');
  const before = await stockOf(bookId);
  const { data: saleId, error } = await cashier.rpc('create_sale', {
    p_items: [{ book_id: bookId, quantity: 2 }], p_payment_method: 'CASH',
    p_tendered_cents: 10000, p_discount_cents: 0,
  });
  expect(error).toBeNull();
  expect(await stockOf(bookId)).toBe(before - 2);
  const { data: movements } = await admin.from('stock_movements')
    .select('quantity, movement_type, previous_stock, new_stock').eq('reference_id', saleId);
  expect(movements).toHaveLength(1);
  expect(movements[0]).toMatchObject({ quantity: -2, movement_type: 'SALE', new_stock: before - 2 });
});
```

Helpers (`tests/helpers/db.ts`): `resetDb()`, `seedStaff()`, `signInAs(role)`, `stockOf(id)` — shared across integration and permission suites.

## Permission test pattern

For each role × representative op, assert allowed/denied (see `bookstore-security` examples): direct table access through RLS, column grants (cost columns), storage policies (upload/delete), RPC `assert_role`.

## E2E (Playwright)

- **POS happy path** (desktop + mobile): login as cashier → scan/search book → add → quantity change → discount → charge → cash tendered → change shown → receipt print modal (assert the printable node's text contains invoice + total) → book stock decreased on the books page.
- **Oversell**: cart quantity capped at stock; a scripted scenario where stock is 1 and two tabs add it → second checkout errors with friendly message, cart intact.
- **Void**: admin voids from sales detail; stock restored; VOIDED tag on reprint.
- **CRUD + responsive**: create book (with an image upload), mobile viewport shows card list + bottom nav + sticky bar; no horizontal page scroll.
- **Auth**: login failure message; logout; cashier blocked from `/users` and `/audit-logs` (403/redirect).
- **Scanner**: emulate a wedge by typing `1234567890123` + Enter into the scan input and assert the item resolves.

Run E2E against a **dedicated test database** (fresh `supabase db reset` + seed per CI run).

## Test data

- `supabase/seed.sql` is dev/test data only (demo users: `owner@test.local`/`admin@test.local`/`cashier@test.local`; a handful of categories, publishers, suppliers, books with known prices/stock). Never ship production data in seeds; never let tests depend on hand-entered prod records.
- Tests create their own entities (books, purchases, sales) with known values and assert exact numbers — never "value changed" assertions on live data.
- Money in tests stays integer cents; use helper factories (`makeBook({ sellingPriceCents: 1500 })`).

## CI

- Pipeline: `typecheck` → `vitest run` (unit → integration → permissions) → `playwright test` (parallel projects) → lint.
- Integration/permission suites need local Supabase: run `supabase start` in CI (or a Supabase CI action), apply migrations, seed, then run tests, then `supabase stop`.
- Flaky rules: no time-dependent assertions without tolerance; no test depending on other tests' state; order-independent via `resetDb()` in `beforeEach` where needed.

## Coverage expectations

- 100% statement coverage for `lib/pricing`, `lib/permissions`, `lib/utils/isbn.ts`, `lib/utils/money.ts`, `lib/receipt` data builder (small pure modules — cheap to fully cover).
- Integration: every RPC's success + failure branches (role, stock, status guards).
- E2E: the POS happy path and one CRUD flow per module at least; mobile coverage for POS, books, inventory.

# Rules

1. Critical money/stock/permission logic is never merged untested.
2. Unit tests are pure (no DB, no network); DB logic is integration-tested against local Supabase — not mocked at the SQL level.
3. Permission tests run as real role sessions through RLS — a unit test of the matrix alone is not sufficient.
4. E2E never hits production; always a fresh local test database.
5. No `describe.only`/`.skip` in committed code; no snapshot-only "tests" without assertions.
6. Tests are deterministic: fixed seeds, explicit dates, no `Date.now()` drift (inject clock helpers in pure functions).

# Implementation Guidance

1. New business rule → add a unit test in `tests/unit` (pure function) first, then implement.
2. New RPC or schema change → migration → regenerate types → integration test for happy + failure branches.
3. New RLS policy → permission test with each affected role.
4. New user flow → Playwright spec; verify it passes on desktop and mobile projects.
5. Run the relevant slice locally (`npx vitest run tests/unit/pricing`), then the full suite before finishing.

# Security

- Tests run against a local/CI database only; never against the remote project's production DB.
- Seeds contain test users with known passwords — never use real passwords; never commit real user data.
- Permission tests double as security regression tests; keep them in CI so policy changes can't silently widen access.

# Performance

- Keep the unit suite fast (no I/O); integration uses one local Supabase instance shared across the suite with per-test reset.
- Playwright: use `webServer` to boot the app; keep specs short; use API calls (not UI) to set up preconditions where possible.

# Testing

(This skill is the testing contract — the "Testing" section of every other skill lists its required tests; implement them here.)

# Common Mistakes

- Mocking the database in unit tests and calling it "integration" (misses RLS, triggers, constraints, and atomicity).
- Testing only the happy path — every RPC needs its failure branches (role, stock, status).
- Letting tests hit production data or production keys.
- Forgetting mobile E2E (the POS on a phone is a first-class target).
- Time-dependent tests (`new Date()` compared to DB `now()`) with no tolerance — flaky CI.
- Skipping permission tests "because RLS is simple".
- Coverage theater: asserting output without asserting the money/stock numbers exactly.
- E2E depending on test order or shared state between specs.

# Examples

**Unit — discount cap (`lib/pricing`):**

```ts
it('caps discount at the configured percent', () => {
  expect(applyDiscount(10000, { percent: 30 }, { maxDiscountPercent: 20 }))
    .toEqual({ discountCents: 2000, totalCents: 8000, error: null });
});
```

**Permission — cashier blocked from voiding via RPC:**

```ts
it('cashier cannot void a sale', async () => {
  const cashier = await signInAs('cashier@test.local', 'password');
  const { error } = await cashier.rpc('void_sale', { p_sale_id: saleId, p_reason: 'test' });
  expect(error?.message).toContain('AUTHZ_DENIED');
});
```

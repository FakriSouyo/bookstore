---
feature: F-17
name: Testing
status: done
skills: [bookstore-testing]
---

# Specification

## Purpose
Formalize the test strategy defined in `bookstore-testing`: unit tests for every critical business-logic module so regressions are caught before deploy.

## Acceptance Criteria
1. `npm run test` runs a Vitest suite covering: pricing (line totals, cart totals, discounts, change, purchase totals), money formatting, ISBN-10/13 validation, slug generation, and the permission matrix.
2. Tests are pure — no network, no database, no React — so they run in CI in under a few seconds.
3. The `@/*` path alias resolves in the test runner (same mapping as `tsconfig.json`).
4. Test files live next to their modules (`lib/**/*.test.ts`) per `bookstore-testing`.

## Out of Scope
- Integration tests against a real Supabase project (needs a live project; see `bookstore-testing` for the setup when one exists).
- E2E POS flows (Playwright harness deferred until a live backend is available).

---
feature: F-17
name: Testing
status: done
skills: [bookstore-testing]
---

# Task List

## Setup

- [x] Install `vitest` (devDependency), add `vitest.config.ts` with `@` alias, add `"test": "vitest run"` script
  - Verify: `npm run test` discovers `lib/**/*.test.ts` — done

## Unit tests (per bookstore-testing: critical business logic)

- [x] `lib/pricing/pricing.test.ts` — lineTotal, cartTotals (discount clamp, bps tax), applyDiscount (percent/fixed/cap/negative/floor), computeChange, purchaseTotals (shipping/tax/discount formula + clamps)
  - Verify: all pass — done (2 initial tests had wrong cap assumptions — corrected to test the real cap semantics)
- [x] `lib/utils/money.test.ts` — formatMoney, formatMoneyCompact, currencySymbol
  - Verify: pass — done
- [x] `lib/utils/isbn.test.ts` — normalizeIsbn, ISBN-10 (incl. X check digit), ISBN-13, valid/invalid raw input
  - Verify: pass — done
- [x] `lib/utils/slug.test.ts` — slugify edge cases + uniqueSlug suffix probing
  - Verify: pass — done
- [x] `lib/permissions/permissions.test.ts` — role matrix: OWNER full, ADMIN excluded from users/settings/audit, CASHIER minimal, unknown role
  - Verify: pass — done

## Close

- [x] Full verification: `npm run test` → 39 tests, 5 files, all pass
  - Verify: done — 39/39 passed
- [x] Update `workflow/backlog.md` F-17 → done
  - Verify: backlog updated — done

## Follow-ups

- Integration tests for `record_movement` / `create_sale` require a live Supabase project; scaffold the Vitest setup when one is provisioned (see `bookstore-testing`).
- E2E POS (cart → payment → receipt) via Playwright once a real backend exists.

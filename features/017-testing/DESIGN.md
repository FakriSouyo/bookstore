---
feature: F-17
name: Testing
status: done
skills: [bookstore-testing]
---

# Design

## Decisions (ADR)

- **Vitest over Jest**: already installed alongside the Vite toolchain; zero-config for pure TS; watch mode for dev. Node environment is sufficient — none of the tested modules touch the DOM.
- **Vitest config file** (`vitest.config.ts`) instead of `package.json` test field, so the `@` alias can be declared once via `resolve.alias`.
- **Test files colocated** (`lib/**/*.test.ts`): matches the `bookstore-testing` convention that a test lives with the code it protects; `include` pattern scoped to `lib/` so Next.js route/app files are never picked up.

## Module map

| Module | Covered invariants |
| --- | --- |
| `lib/pricing/pricing.ts` | lineTotal ≥ 0; discount clamped to subtotal; tax in basis points on discounted amount; percentage/fixed discount rejected above cap; change never negative; purchase totals formula |
| `lib/utils/money.ts` | cents→currency formatting; zero/negative; compact notation threshold |
| `lib/utils/isbn.ts` | ISBN-10 check digit incl. X; ISBN-13 weighted sum; normalization strips dashes/spaces |
| `lib/utils/slug.ts` | lowercasing, diacritics, separator runs, empty fallback; `uniqueSlug` suffix probing |
| `lib/permissions/permissions.ts` | OWNER ⊇ ADMIN ⊇ CASHIER; cashier has no inventory/purchase/report writes; unknown role → false |

## Verification loop
`npm run test` after each edit; full `typecheck + lint + build + test` at feature close.

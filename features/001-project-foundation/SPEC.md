---
feature: F-01
name: Project Foundation
status: done
skills: [bookstore-core, bookstore-ui]
---

# Specification

## Purpose

Create the working Next.js project foundation for the Bookstore Management & POS system: the exact stack from `bookstore-core`, TypeScript strict, Ant Design wired with the `bookstore-ui` design tokens, Tailwind retained for custom styling, and the shared low-level utils the global conventions depend on. Everything later (F-02 onward) builds on this foundation.

## Background / Motivation

Phase 1 of the 19-phase order in `bookstore-core`. No feature can start until the foundation typechecks, lints, and builds, and until the theme system exists so every screen is consistent.

## Functional requirements

1. A Next.js App Router project (no `src/` dir, per the layout in `bookstore-core`) with TypeScript and Tailwind, ESLint configured.
2. TypeScript strict mode enabled (no `any` rule enforced by review; strict flags on).
3. Ant Design v5 installed and wired via `ConfigProvider` using a single source of truth for design tokens per `bookstore-ui` (primary/success/warning/error/info, background/surface/border, text/secondary/disabled, 8px spacing scale, radius, numeric KPI style).
4. SSR style registration for AntD in the App Router via `@ant-design/nextjs-registry` (no FOUC).
5. React 19 compatibility for antd v5 static APIs via `@ant-design/v5-patch-for-react-19`.
6. Tailwind remains available for custom styling only; body background/text colors derive from the tokens.
7. Shared utils foundation per `bookstore-core` conventions: `lib/utils/money.ts` (integer-cents formatting) and `lib/utils/errors.ts` (typed `AppError` with the error taxonomy).
8. npm scripts: `dev`, `build`, `start`, `lint`, `typecheck`.

## Non-functional requirements

- `npx tsc --noEmit`, `npm run lint`, and `npm run build` all pass.
- Home page renders a themed AntD component (proves the theme applies).
- No dead dependencies beyond the stack in `bookstore-core`.

## Out of scope

- Supabase setup, env vars, clients (F-02/F-03).
- Any business screens, layouts, or navigation shell (F-04).
- Tests infrastructure (formalized in F-17; F-01 is verified by typecheck/lint/build + manual smoke check).
- ESLint/Prettier plugin for antd import order (nice-to-have, later).

## Acceptance criteria

- [ ] `npm run typecheck` passes with `strict: true`.
- [ ] `npm run lint` passes.
- [ ] `npm run build` produces a production build.
- [ ] `npm run dev` renders the home page with a visibly themed AntD component (primary color from tokens).
- [ ] All token values live in exactly one file (`lib/theme/tokens.ts`); no hardcoded colors in components.
- [ ] `lib/utils/money.ts` and `lib/utils/errors.ts` exist and are typed (`no any`).
- [ ] Design tokens match `bookstore-ui`: primary `#b45309`, success `#16a34a`, warning `#d97706`, error `#dc2626`, info `#0284c7`, background `#f7f6f4`, surface `#ffffff`, border `#e6e2dc`, text `#1f1e1d`, secondary `#6b6865`, disabled `#b5b1ac`, radius 6.

## Edge cases & assumptions

- antd v5 (not v6) per `bookstore-ui`; React 19 needs the official v5 patch — included, documented in DESIGN.md.
- Single currency assumption from `bookstore-core` applies to `formatMoney` (default `USD`, overridable).
- Error taxonomy codes exactly as in `bookstore-core` (VALIDATION_ERROR, AUTH_ERROR, AUTHZ_ERROR, NOT_FOUND, BUSINESS_RULE, DATABASE_ERROR, NETWORK_ERROR, UNEXPECTED).

## References

- `skills/bookstore-core/SKILL.md` — stack, directory layout, error taxonomy, DoD
- `skills/bookstore-ui/SKILL.md` — design tokens, ConfigProvider theme
- Next feature: F-02 Supabase Database

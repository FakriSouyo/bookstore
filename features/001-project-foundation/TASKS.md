---
feature: F-01
name: Project Foundation
status: done
skills: [bookstore-core, bookstore-ui]
---

# Task List

Execution order. Check a box only after the task is done **and** its verification passes.

## Phase A — Scaffold

- [x] Scaffold create-next-app (App Router, TypeScript, Tailwind, ESLint, no `src/` dir, npm, `@/*` alias) and move it to the repo root
  - Verify: `app/`, `package.json` present with next/react/typescript — done (Next 16.3.1, React 19.2.8, Tailwind v4)
- [x] Install base deps: `antd@^5`, `@ant-design/icons`, `@ant-design/nextjs-registry`, `@ant-design/v5-patch-for-react-19`, `zod`
  - Verify: `npm ls` resolves — done (78 packages added)
- [x] Add `"typecheck": "tsc --noEmit"` script; confirm `strict: true` in tsconfig
  - Verify: `npm run typecheck` passes — done

## Phase B — Theme system (per bookstore-ui)

- [x] Create `lib/theme/tokens.ts` — all design tokens from `bookstore-ui` (single source of truth)
  - Verify: tokens match the acceptance criteria values — done
- [x] Create `lib/theme/antd-theme.ts` — `ThemeConfig` mapping tokens to AntD seed + component tokens (per `bookstore-ui`)
  - Verify: exports `ThemeConfig` typed object — done
- [x] Create `app/providers.tsx` — React 19 patch import + `ConfigProvider` (theme) + antd `<App>`
  - Verify: typecheck passes — done
- [x] Wire `app/layout.tsx` with `AntdRegistry` + providers; metadata title "Bookstore Management"
  - Verify: dev server renders without FOUC and without console errors — done (SSR styles via AntdRegistry)
- [x] Update `app/globals.css` — keep Tailwind, add token CSS variables, body bg/text from tokens, `.tabular-nums` utility
  - Verify: body background is `#f7f6f4` — done
- [x] Replace `app/page.tsx` with a themed placeholder (Card + primary Button + `Money` display)
  - Verify: primary color `#b45309` visibly applied — done (rendered `btn-primary`, themed page confirmed)

## Phase C — Shared utils (per bookstore-core conventions)

- [x] Create `lib/utils/money.ts` — `formatMoney(cents, { currency })`, cents helpers, tabular-nums formatting
  - Verify: `formatMoney(123456)` → `"$1,234.56"`, typecheck passes — done
- [x] Create `lib/utils/errors.ts` — `AppError` class, error-code union per `bookstore-core`, `fromError()` normalizer, safe-message map
  - Verify: typecheck passes; no `any` — done

## Final

- [x] Run full verification: `npm run typecheck`, `npm run lint`, `npm run build`
  - Verify: all pass — done (typecheck ✓, lint ✓, build ✓ static prerender)
- [x] Update `workflow/backlog.md` status F-01 → done
  - Verify: backlog updated — done
- [x] Update SPEC/DESIGN/TASKS status → done; note follow-ups (F-02 Supabase Database is next)
  - Follow-ups: F-02 (schema/migrations), F-03 (env + auth clients). Note: dev server picked an ephemeral port in smoke test; `npm run dev` defaults to 3000 when free.

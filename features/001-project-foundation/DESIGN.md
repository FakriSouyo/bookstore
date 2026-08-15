---
feature: F-01
name: Project Foundation
status: done
skills: [bookstore-core, bookstore-ui]
---

# System Design

## Context & constraints

- Stack fixed by `bookstore-core`: Next.js App Router, TypeScript strict, Ant Design v5, Tailwind (custom styling only), `zod` for validation (installed now, used from F-03 onward).
- Directory layout per `bookstore-core`: `app/`, `components/`, `lib/`, `types/` at project root (no `src/`).
- Design tokens per `bookstore-ui` must be centralized in `lib/theme/tokens.ts` and feed the AntD `ConfigProvider` theme.

## Architecture decisions (ADRs)

- **ADR-1: antd v5 + React 19 patch.** React 19 is what current create-next-app installs. antd v5 static APIs (`message`, `notification`, `Modal.confirm`) need the official `@ant-design/v5-patch-for-react-19`; import it once in the client providers. Theme token API is unchanged, so all `bookstore-ui` conventions hold. (If the patch ever becomes unnecessary, remove the import.)
- **ADR-2: `@ant-design/nextjs-registry` for SSR styles.** App Router renders client components on the server; without `AntdRegistry` the first paint has unstyled AntD components (FOUC). Wrap `app/layout.tsx` children with it.
- **ADR-3: Token → CSS variable bridge.** Expose the core color tokens as CSS custom properties in `globals.css` so Tailwind custom classes and the body background can reference the same values. Components still import TS tokens directly for AntD theming.
- **ADR-4: Money utils from day one.** `lib/utils/money.ts` implements cents formatting (per the integer-cents convention) so no float money ever enters the codebase.
- **ADR-5: Typed errors from day one.** `lib/utils/errors.ts` implements `AppError` + the `bookstore-core` taxonomy; all future services throw it and all future UIs map it. `fromError(e)` normalizes unknown errors so raw DB messages can never leak.

## Data model changes

None (F-02 owns the schema).

## API / server actions / RPCs

None.

## UI design

- `app/layout.tsx` (server component): html lang, metadata title "Bookstore Management", wraps children in `AntdRegistry` → `AntdProvider` (client).
- `app/providers.tsx` ('use client'): imports the React 19 patch, renders `ConfigProvider` (theme from tokens) wrapping antd `<App>` (context-based message/notification for future phases).
- `lib/theme/tokens.ts`: the full token object from `bookstore-ui` (colors, radius 6, font stack `'Inter', system-ui, sans-serif`, space scale).
- `lib/theme/antd-theme.ts`: the `ThemeConfig` mapping tokens → AntD seed + component tokens (Table header, Button height, etc. per `bookstore-ui`).
- `app/page.tsx`: minimal themed placeholder (Card + primary Button + Money display) proving the theme renders — replaced by real screens from F-04 onward.
- `app/globals.css`: keep Tailwind import; add token CSS variables + body background/text + `tabular-nums` utility.

## Data flow

N/A (no data yet).

## Security considerations

- No secrets, no clients yet (F-02/F-03). Nothing to secure beyond keeping the scaffold clean.
- `errors.ts` enforces the "never surface raw errors" rule from the start.

## Performance considerations

- `AntdRegistry` renders inline styles server-side (no layout shift); zero runtime cost beyond antd's normal bundle.
- No layout/fonts beyond defaults; Inter loaded as system stack (no webfont download).

## Testing plan

- F-01 is verified by `tsc --noEmit`, `eslint`, `next build`, and a dev-server smoke check (home page shows themed component). Formal test infrastructure lands in F-17.
- Future unit tests for `money.ts`/`errors.ts` are planned in F-17 (pure functions — no refactor expected).

## Files to create / modify

```
app/layout.tsx          (overwrite scaffold)
app/page.tsx            (overwrite scaffold with themed placeholder)
app/providers.tsx       (new)
app/globals.css         (overwrite scaffold, add tokens)
lib/theme/tokens.ts     (new)
lib/theme/antd-theme.ts (new)
lib/utils/money.ts      (new)
lib/utils/errors.ts     (new)
package.json            (scripts: typecheck)
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Bookstore project notes (learned in session)

## Supabase deployment & drift
- The user runs migrations **manually** in Supabase Dashboard → SQL Editor (this repo's `supabase/migrations/*.sql` are not auto-applied). The deployed DB **can silently drift** from migration files: `receive_purchase`/`adjust_inventory` in the DB called `assert_role(text[])` while migrations say `app_role[]`, breaking Receive Purchase & Stock Adjustment features. After editing function SQL, tell the user to re-run it (or apply `supabase/migrations/0005_sync_functions.sql`).
- Verify deployed function signatures via the PostgREST OpenAPI spec (`GET {SUPABASE_URL}/rest/v1/` with `Accept: application/vnd.pgrst.object+json` + service role key in `apikey` header) — it lists all callable RPCs and their arg types.
- RPC functions exposed via PostgREST are **not** protected by RLS. `record_movement` (stock engine) was callable by any authenticated user → cashier could inflate stock (confirmed, rolled back). Every stock-mutating function must be `REVOKE ... FROM authenticated, anon` and only called from inside security-definer functions.

## Supabase Storage quirks
- Image transform params (`?width=…&quality=…`) return **identical bytes on the Free plan** (measured 0% reduction); resizing needs Pro plan+, and the correct URL is `/storage/v1/render/image/public/…`, not `/object/public/…?width=`. Don't add transform params unless the plan supports them.
- Storage RLS policy only allows paths prefixed `books/`; uploads elsewhere are silently rejected. Also `upsert: true` on a new object hits the UPDATE path and can be rejected by the policy while `upsert: false` succeeds — the app uses `upsert: false`.

## supabase-js / auth scripting quirks
- supabase-js does **not** read `Cookie` headers in Node scripts: you must extract `access_token` from the session cookie and set `global.headers.Authorization = "Bearer …"` (or per-request `headers`) before queries — otherwise `getUser()` is anonymous even with a valid cookie.
- `supabase.auth.getUser()` is a **network round-trip** (400ms–1.8s cold); Next middleware's `getSession()` (JWT-local) is the fast path. `getSession()` requires the **full session JSON incl. `user`** in the cookie — a minimal cookie with only `access_token` gets 307-redirected to login.
- Session cookie TTL ≈ 1 hour; refresh via `POST {SUPABASE_URL}/auth/v1/token?grant_type=refresh_token` using the `refresh_token` from the cookie.
- `.mjs` scripts are ESM — `require()` throws; use `import`. Run with `node --env-file=.env scripts/…`. `setval()` cannot be called over REST.

## Seed / business-flow facts
- `scripts/seed-demo.mjs --force` wipes and reseeds; it must flow through the real business path (RPC `create_purchase`/`receive_purchase`/`create_sale`) — raw inserts bypass RLS guards and desync stock. It creates the demo OWNER account too.
- `suppliers` has **no `slug` column** (categories/publishers do). RPC guards: `tendered_cents: 0` → `TENDERED_BELOW_TOTAL`; oversized negative adjustment → `NEGATIVE_STOCK` (good — do not weaken).

## UI architecture (post-antd migration)
- antd was fully removed; UI is shadcn-style components in `components/ui/*` (new-york, square corners, 32px controls) + sensory-ui core at `@/components/ui/sensory-ui` (sound engine still active), lucide-react icons, recharts charts, sonner toasts. Theme is CSS-first Tailwind v4 vars in `app/globals.css`; `lib/theme/tokens.ts` is dead reference code.
- `skills/bookstore-ui/SKILL.md` still documents antd — stale; UI work should read the components themselves.
- In-app guide lives at `/guide` (`components/guide/*` + `app/(app)/guide/page.tsx`); its screenshots are generated, not hand-written: run `node scripts/capture-guide.mjs` (needs the dev server on port 62526 + Chrome + `puppeteer-core` devDep) to re-record `public/guides/**`, then keep captions in `components/guide/guide-data.ts` in sync with the files. The stock-flow explainer there answers "stok nambah dari mana" (purchases only when RECEIVED).
- `PERF.md` at repo root is the performance experiment ledger (kept + reverted attempts, budget, bench scripts) — read it before doing perf work to avoid re-running dead ideas.
- CatalogManager: don't derive Indonesian singular labels via `slice(0, -1)` ("Kategori" → "Kategor"); use explicit singular/plural label pairs.
- Known unfixed security findings: CSV formula injection in `lib/reports/export.ts` `escapeCsv` (cells starting `= + - @` need a `'` prefix), and password-reset `redirectTo` built from the `Origin` header (verify proxy behavior before trusting).

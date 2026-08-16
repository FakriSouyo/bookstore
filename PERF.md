# Performance

Measured, not guessed. Anything that lands here must pay for itself with a
before/after number taken the same way. Neutral changes are reverted, not kept.

## Baselines (production build, `npm run build && npm run start`)

Measured 2026-08-16 against a live Supabase project, authenticated session,
fresh render per route (second visits hit Next's cache: 4–80ms).

| Route | Fresh render | JS payload (gzip) |
|---|---|---|
| /books | 594ms | ~780KB |
| /dashboard | 823–879ms | +384KB recharts (lazy, dashboard-only) |
| /pos | 505ms | — |
| /categories | ~600ms | — |

Dev mode (`next dev`) is 2–5× slower per navigation — Turbopack does
per-request tracing with no cache. It is not representative of production;
always benchmark `next start`.

Per-request auth cost (bench: `node --env-file=.env scripts/bench-auth.mjs`):

| Step | Warm | Cold |
|---|---|---|
| `auth.getUser()` | 402–846ms | 1824ms |
| profiles lookup (role) | 189–306ms | — |

`getUser()` is a network round-trip to Supabase Auth and is run on every
request **by design** — the auth skill requires server-side JWT verification,
and deactivated/banned users must be rejected. `getSessionUser` is wrapped in
React `cache()` so layout + page checks share ONE round-trip per request, and
middleware uses the cookie `getSession()` fast path (no network). Do not
"optimize" this by trusting client claims — that is a security regression.

## Performance budgets

```
Initial JS (gzip)      < 250KB  (currently ~780KB /books — recharts only on dashboard)
CSS                    < 50KB
API response (p95)     < 200ms  (Supabase RPC dashboard: 130–430ms warm)
LCP                    ≤ 2.5s   (all routes pass in production)
INP                    ≤ 200ms
CLS                    ≤ 0.1    (all images carry explicit width/height)
```

## Experiment ledger

| Idea | Baseline → Result | Verdict | Why |
|---|---|---|---|
| Thumbnail image transform (`?width=120&quality=70`) | original 2504B → thumb 2504B (0%) | **reverted** | Supabase transforms require Pro plan + the `/storage/v1/render/image/` path. On Free plan the params are ignored and bytes are identical. Revisit only if the project is upgraded; docs already note "thumbnails use `?width=` where supported". |
| `loading="lazy"` + `decoding="async"` on book-list covers | n/a (catalog empty at measurement time) | **kept** | Browser-standard directive, zero risk, explicit width/height ⇒ no CLS. Below-fold covers are deferred when the catalog fills. |
| Per-request `cache()` on `getSessionUser` (prior session) | /books 1625ms → 238–321ms (dev, warm) | kept | Deduped layout+page auth lookups to one round-trip. |
| Parallelize page queries + prefetch nav on mount (prior session) | /books 2.5s → 1.2s; /dashboard 2.4–3.2s → 1.27s (dev, warm) | kept | Streaming dashboard shows KPIs before charts. |
| Stream dashboard (KPI first, charts via Suspense) (prior session) | headline numbers no longer wait on 3 heavy RPCs | kept | — |

## Scripts

- `scripts/bench-dashboard.mjs` — times the 4 dashboard RPCs against the live project.
- `scripts/bench-auth.mjs "<sb-...-auth-token=...>"` — times getUser + profile lookup.
  Pass the session cookie value; it extracts the access token and sends it as
  a real `Authorization` header (supabase-js ignores a raw `Cookie` header).
  Note: the cookie expires ~1h; refresh via the Supabase `refreshSession` API
  or re-capture from the browser before benchmarking.

## Rules

- Re-measure the same way you measured the baseline before keeping a change.
- Never "optimize" by weakening security (dropping `getUser()`, trusting
  client-provided stock/prices, bypassing RLS).
- No N+1 patterns in `lib/services/*` — one query per page id set, never per row.
- List pages paginate server-side (20/page); never fetch whole tables.

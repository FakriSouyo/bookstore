---
feature: F-18
name: Security Review
status: done
skills: [bookstore-security]
---

# Design

## Method
Static review of the four migrations plus a targeted code search for sensitive patterns, organized as pass/fail checklist items mapped to the `bookstore-security` SKILL sections:

1. **RLS pass** — read `0002_rls.sql`: confirm `enable row level security` on all 16 tables, per-table policy intent (staff-read/admin-write, cashier-scoped sales, append-only audit, OWNER-only settings).
2. **RPC pass** — grep for `security definer` and `search_path`; read `record_movement`, `adjust_inventory`, `create_sale`, `create_purchase`, analytics RPCs; confirm caller re-authz and server-side price recomputation.
3. **Storage pass** — confirm bucket policies (`covers_*_admins`, path constraint `books/{book_id}/`) and server-generated object names in `lib/utils/image.ts`.
4. **Action pass** — confirm every `app/**/actions.ts` calls `requireRole`/permission helpers and validates with zod; error mapping via `lib/utils/errors.ts`.
5. **Secret pass** — `grep -r "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY"` must return nothing.

## Deliverables
- `docs/security-review.md` — the checklist with evidence + tradeoffs + pre-deploy actions.

---
feature: F-18
name: Security Review
status: done
skills: [bookstore-security]
---

# Task List

## RLS

- [x] Verify RLS enabled on all 16 tables (`0002_rls.sql`) — done
- [x] Verify sales/cashier scoping, audit append-only + OWNER-only read, settings OWNER-only update — done
- [x] Verify `stock_movements` has no direct-write policies (RPC-only) — done

## RPCs / Functions

- [x] Verify all mutating RPCs `security definer` + `set search_path = public, pg_temp` — done
- [x] Verify caller re-authz (`assert_role` / role checks / `is_admin()`) — done
- [x] Verify `create_sale` recomputes prices from DB (client price not trusted), locks books in id order, enforces `NEGATIVE_STOCK` — done
- [x] Verify analytics RPCs are `stable` and admin-gated — done

## Storage

- [x] Verify bucket policies admin-only with `books/` path constraint on insert — done
- [x] Verify server-side UUID object names (original filenames unused) — done

## Server Actions & Secrets

- [x] Verify all `app/**/actions.ts` gate with permission helpers + zod — done
- [x] Grep: no `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` anywhere — done

## Deliverables

- [x] Write `docs/security-review.md` with checklist, evidence, tradeoffs, pre-deploy actions — done
- [x] Update `workflow/backlog.md` F-18 → done — done

## Follow-ups

- Before production deploy: run `supabase db push`, verify `pg_policies`, seed first OWNER profile, confirm bucket policies on the live project (recorded in `docs/security-review.md` §6).

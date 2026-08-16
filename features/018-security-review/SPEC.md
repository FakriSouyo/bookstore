---
feature: F-18
name: Security Review
status: done
skills: [bookstore-security]
---

# Specification

## Purpose
Run the `bookstore-security` pre-merge checklist against every migration, RPC, storage policy, and server action in the repo, and record the outcome so the review is reproducible.

## Acceptance Criteria
1. `docs/security-review.md` exists with a checkable table: RLS per table, RPC authz, storage policies, server-action gates, and known tradeoffs.
2. Every item is either ✅ verified by code inspection or flagged as a required pre-deploy action (live-project verification).
3. No `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` usage; service role key only in server-only `lib/supabase/admin.ts` (grep-verified).
4. All state-mutating RPCs are `security definer` with explicit `search_path = public, pg_temp` and re-authorize the caller.

## Out of Scope
- Live-policy verification against a provisioned Supabase project (documented as a pre-deploy action).

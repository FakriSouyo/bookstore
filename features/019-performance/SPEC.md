---
feature: F-19
name: Performance Optimization
status: done
skills: [bookstore-core, bookstore-supabase]
---

# Specification

## Purpose
Apply the performance rules from `bookstore-core` (server-side pagination, DB aggregation, indexes, no whole-table fetches) and record what is already optimized plus the next-step plan.

## Acceptance Criteria
1. All list pages paginate server-side via `.range()` + `count: 'exact'` — no unbounded row sets to the browser.
2. Dashboard/report numbers come from Postgres aggregate RPCs, not frontend reduction.
3. Hot lookup columns have indexes in `0001_init.sql`.
4. `docs/performance.md` documents verified optimizations, measured-before-you-guess guidance, and the concrete next steps (FTS search, RPC tightening, caching) with the conditions that trigger them.

## Out of Scope
- Actual load testing (requires a provisioned Supabase project with seeded data).
- Implementing FTS search / report caching now — documented as conditional follow-ups.

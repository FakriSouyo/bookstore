---
feature: F-19
name: Performance Optimization
status: done
skills: [bookstore-core, bookstore-supabase]
---

# Task List

## Verify existing optimizations

- [x] Confirm all list pages use server-side `.range()` pagination — done
- [x] Confirm dashboard + reports use Postgres aggregate RPCs — done
- [x] Confirm hot-column indexes exist in `0001_init.sql` — done
- [x] Confirm no `select('*')` in list paths — done

## Document

- [x] Write `docs/performance.md` — verified inventory, measure-don't-guess guidance, conditional next steps (FTS, single-pass sale RPC, caching, keyset pagination) — done
- [x] Update `workflow/backlog.md` F-19 → done — done

## Follow-ups

- Implement Postgres FTS for POS search when the catalog grows (biggest scan-speed win).
- Run `explain analyze` on `create_sale` / `receive_purchase` / `dashboard_kpis` after seeding real data.
- Add `unstable_cache` to dashboard/reports after measuring Supabase latency.

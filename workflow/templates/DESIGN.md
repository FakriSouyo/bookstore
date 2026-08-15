---
feature: F-XX
name: <Feature name>
status: draft | in-progress | done
skills: [bookstore-database, bookstore-supabase, bookstore-auth, bookstore-security, bookstore-ui, bookstore-responsive, <owning>]
---

# System Design

## Context & constraints

Short restatement of the spec's constraints (stack, conventions, boundaries) that shape the design. Cite the skills that impose them.

## Architecture decisions (ADRs)

Numbered decisions with rationale. One decision per item. Examples: which RPCs to add, how money is stored, which client to use, how a state transition is modeled. Each decision must point at the skill rule that motivated it.

- ADR-1: ...
- ADR-2: ...

## Data model changes

- New/changed tables, enums, columns, indexes, constraints (schema lives in `bookstore-database`).
- New/changed RPC functions and their signatures + permission checks.
- RLS/storage policy changes (inventory lives in `bookstore-security`).

## API / server actions / RPCs

List the server entry points this feature adds (server actions, route handlers, RPC calls) with their input/output shape, validation (zod), and permission requirement.

## UI design

- Pages/routes added (App Router structure per `bookstore-core`).
- Components: which shared components from `bookstore-ui` are reused, which are new.
- Responsive behavior per device class (from `bookstore-responsive`): tables → card lists, sticky bars, drawer nav, etc.
- Feedback: loading / success / error / empty / confirmation patterns.

## Data flow

Describe a representative flow end-to-end (e.g., "cashier scans → cart → checkout RPC → sale + movements → receipt"), noting where the server recomputes authoritative values and where audit is written.

## Security considerations

- Authorization: which permission(s) gate which operations (`bookstore-auth`/`bookstore-security`).
- RLS coverage for any new table/column; column-level protection for cost data.
- What must never be trusted from the client.

## Performance considerations

- Indexes the queries use; pagination strategy; aggregation in SQL where applicable.

## Testing plan

- Unit (pure logic) and integration (local Supabase RPC/RLS) tests to add, per `bookstore-testing` and the owning skill's Testing section.
- E2E scenarios (desktop + mobile) where relevant.

## Files to create / modify

```
app/...            (routes)
components/...     (components)
lib/...            (services, queries, utils)
supabase/migrations/...  (schema changes)
tests/...          (tests)
```

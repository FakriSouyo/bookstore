---
feature: F-XX
name: <Feature name>
status: draft | in-progress | done
skills: [bookstore-core, <owning skill(s)>]
---

# Specification

## Purpose

What this feature is and why the business needs it. One paragraph. No implementation details.

## Background / Motivation

Context: which skill/phase it belongs to, what it depends on, what problem it solves for the owner/admin/cashier.

## Functional requirements

Numbered list of what the feature must do, stated from the user's perspective. Each requirement must be testable.

1. ...
2. ...

## Non-functional requirements

- Performance expectations (e.g., list paginated server-side, query uses existing indexes — see `bookstore-database`).
- Responsive behavior for desktop / tablet / mobile (see `bookstore-responsive`).
- UX states required: loading / success / error / empty (see `bookstore-ui`).

## Out of scope

Explicitly list what this feature does NOT do (and which feature will handle it). This prevents scope creep.

## Acceptance criteria

Checklist that, when all true, means the feature is done. Written against the skills' rules (RLS, authz, inventory ownership, money-in-cents, audit, etc.).

- [ ] ...
- [ ] ...

## Edge cases & assumptions

Documented defaults from `bookstore-core` that apply here, plus any new assumptions this feature introduces (follow the "never invent business rules silently" rule).

## References

- `skills/bookstore-core/SKILL.md` (routing, conventions, DoD)
- `skills/<owning>/SKILL.md`
- Related features: F-XX, F-YY

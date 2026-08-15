---
feature: F-XX
name: <Feature name>
status: draft | in-progress | done
skills: [<owning skill(s)>, bookstore-testing]
---

# Task List

Execution order. Check a box only after the task is done **and** its verification passes. Each task names the skill that owns the rule. Add discovered work here as new tasks — never work ad hoc outside this list.

## Phase A — <area>

- [ ] Task: short imperative description (per `bookstore-xxx`)
  - Verify: how to verify (command, manual check, test)

## Phase B — <area>

- [ ] Task: ...
  - Verify: ...

## Final

- [ ] Run full verification: `npm run typecheck`, `npm run lint`, `npm test` (where applicable), `npm run build`
- [ ] Update `workflow/backlog.md` status → done
- [ ] Update SPEC/DESIGN/TASKS status → done; note follow-ups

# Feature-Driven Workflow

Every feature of the Bookstore Management & POS system goes through a fixed lifecycle that produces three living `md` artifacts — **Specification → System Design → Task List** — and is executed by the coding agent **against those artifacts, using the `bookstore-*` skills**. No feature is worked from a vague instruction; it is worked from its own docs.

## Lifecycle

```
Select → Spec → Design → Tasks → Execute → Verify → Close
```

1. **Select** — pick the next feature from [`backlog.md`](./backlog.md), which is ordered by dependency (the 19 phases from `bookstore-core`).
2. **Spec** — write `features/<id>-<name>/SPEC.md` from [`templates/SPEC.md`](./templates/SPEC.md). Answers *what* and *why*: requirements, acceptance criteria, edge cases.
3. **Design** — write `DESIGN.md` from [`templates/DESIGN.md`](./templates/DESIGN.md). Answers *how*: architecture decisions, data model/API/UI plan, files to touch, security & testing plan.
4. **Tasks** — write `TASKS.md` from [`templates/TASKS.md`](./templates/TASKS.md). An ordered, checkable task list. Each task names the skill that owns the rule it implements and its verification step.
5. **Execute** — the agent executes `TASKS.md` top-down, checking boxes as it goes. Typecheck + relevant tests after each chunk. Boundaries are enforced by the skills (e.g., no stock writes outside `bookstore-inventory`, no client-only authz, no mock data in production paths).
6. **Verify** — run the Definition of Done from `bookstore-core` plus the feature's acceptance criteria and the tests required by `bookstore-testing` and the owning skills.
7. **Close** — set `status: done` in the three docs and in `backlog.md`; record follow-ups; proceed to the next feature.

## Which skills produce which artifact

| Artifact | Consult | Produces |
| --- | --- | --- |
| SPEC.md | Owning skill(s) from backlog + `bookstore-core` | Requirements, acceptance criteria |
| DESIGN.md | `bookstore-database`, `bookstore-supabase`, `bookstore-auth`, `bookstore-security`, `bookstore-ui`, `bookstore-responsive`, owning skill | Architecture decisions, data/API/UI plan |
| TASKS.md | Owning skill(s) + `bookstore-testing` | Ordered executable tasks with verification |
| Execution | Owning skill(s) + `bookstore-core` global rules | Working code per DoD |

## Rules

1. Docs are living artifacts: update `DESIGN.md` when a decision changes during execution; never let code silently drift from the docs.
2. Every doc has frontmatter: `feature`, `name`, `status`, `skills`.
3. The agent executes only tasks listed in `TASKS.md`. Discoveries during execution become new tasks in `TASKS.md` — never ad-hoc work outside the plan.
4. Every task references its owning skill (e.g., "per `bookstore-inventory`"). If a task doesn't map to a skill, it is probably out of scope for this feature.
5. Statuses: `draft → in-progress → done` (per feature), `backlog → active → done` (per feature in `backlog.md`).
6. Do not start a feature whose dependencies are not done (see `backlog.md` "Depends on").
7. Definitions of done: the acceptance criteria in `SPEC.md` **and** the DoD checklist in `bookstore-core`.

## Feature package structure

```
features/
  001-project-foundation/
    SPEC.md
    DESIGN.md
    TASKS.md
```

## Starting a new feature

1. `mkdir features/<id>-<name>`
2. Copy the three templates.
3. Read the owning skills listed in `backlog.md`.
4. Fill SPEC.md → review → fill DESIGN.md → fill TASKS.md → set status `in-progress` in `backlog.md`.
5. Execute.

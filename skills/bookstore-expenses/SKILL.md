---
name: bookstore-expenses
description: Expense management module for the Bookstore Management & POS app — operational expenses (rent, electricity, internet, salary, transport, other), CRUD rules, monthly summaries, and how expenses feed net profit in bookstore-reports.
---

# Purpose

Define the expense module: tracking operational costs (rent, utilities, salaries, transport, etc.) so the owner can see where money goes and reports can compute net profit. Expenses are simple, tamper-resistant records — created once, never edited silently, deletable only by correction.

# Scope

- Expense model and categories.
- CRUD service and UI (`/expenses`).
- Validation rules (amount, date, category, description).
- Monthly summaries and net-profit integration.
- Audit and permissions.

Out of scope: the `expenses` table schema (see `bookstore-database`), net-profit aggregation (see `bookstore-reports`).

# When to Use

Any task involving expenses: adding/editing expenses, the expenses list, expense summaries, or net-profit reports that include expenses.

# Architecture

## Data model (from `bookstore-database`)

`expenses`: `category` (enum), `amount_cents` (> 0), `expense_date`, `description`, `created_by`, timestamps.

Categories: `RENT | ELECTRICITY | INTERNET | SALARY | TRANSPORTATION | OTHER` (enum in `bookstore-database`; extend by migration, never free text).

## Service (`lib/services/expenses.ts`)

- `listExpenses({ page, pageSize, from, to, category, search })` — server-paginated, ordered `expense_date desc`, joined with creator name.
- `createExpense(input)` — validates (`amount > 0`, date not in future by default — allow small future slack only if configured; documented), inserts, audits `expenses.create`.
- `updateExpense(id, input)` — edits description/category/date only; **amount edits require a delete + recreate** (a corrected expense is a new record — keeps the money trail honest). Document this as the rule.
- `deleteExpense(id)` — with `Popconfirm`; audits `expenses.delete` with the old amount in metadata.

## UI (`/expenses`)

- List: `ResponsiveTable` — desktop columns `Date | Category | Description | Amount | By | Actions`; mobile cards show date, category tag, description, amount, "More".
- Filters: month/date range, category.
- Create/edit: small form (category `Select`, amount `MoneyInput`, date `DatePicker`, description `TextArea`) — modal on desktop, full-screen section on mobile.
- Monthly summary card above the list: this month's total + top category (aggregate query; reused by reports).
- Empty state with "Record your first expense" CTA.

## Permissions

- `expenses:view` — ADMIN/OWNER (list, summaries).
- `expenses:manage` — ADMIN/OWNER (create/update/delete). Cashiers have no expense access.

## Net profit

- `bookstore-reports` computes **net profit = gross profit (sales) − expenses** for a period (expenses summed by `expense_date` within the range). The expenses module only stores data; the report owns the calculation.

# Rules

1. Amounts are positive integer cents; zero/negative rejected (DB `CHECK` + validation).
2. `expense_date` defaults to today; backdating is allowed with a note (audited) — owners may reconcile earlier months.
3. Amount edits are forbidden: correct by delete + recreate. The audit trail records both.
4. Deletions are confirmations-with-consequence, audited, and never cascade to reports retroactively beyond the normal exclusion.
5. Cashiers never see expenses.
6. Categories come from the enum; adding one is a migration, not a UI text field.

# Implementation Guidance

1. Build the list/filter/form following `bookstore-ui` + `bookstore-responsive` patterns (ResponsiveTable, stacked mobile form).
2. Server actions: `requireRole('expenses:manage')` → zod validation → service → `revalidatePath('/expenses')`.
3. Monthly summary query: `select date_trunc('month', expense_date), sum(amount_cents) ... group by 1` (index `expenses_date_idx`).
4. Add "Expenses" to net profit in the profit report (`bookstore-reports`) by joining the period's `expenses` sum — one SQL aggregate.

# Security

- RLS (see `bookstore-security`): OWNER/ADMIN select/insert/update/delete; cashiers no access.
- `created_by` is set server-side from the session, never client-supplied.
- Audit every create/update/delete with amount in metadata (money-trail integrity).

# Performance

- Server-side pagination; monthly summary is a single indexed aggregate.
- No joins needed beyond creator name (small table).

# Testing

- Unit: amount/date validation, category enum mapping.
- Integration: create/update/delete with permission checks; cashier blocked (`AUTHZ_DENIED`); audit rows written with amounts.
- Report integration: adding an expense changes net profit for the period by the exact amount; deleting removes it.
- E2E: add expense → appears in list and monthly summary; delete with confirmation.
- See `bookstore-testing`.

# Common Mistakes

- Free-text categories (breaks summaries and filtering).
- Editing amounts in place (loses the money trail).
- Cashier access to expenses (data leak).
- Client-supplied `created_by`.
- Forgetting expenses in net profit (owner sees inflated profit).
- Float money.
- Deleting without confirmation or audit.

# Examples

**Create expense action:**

```ts
'use server';
export async function createExpense(input: ExpenseFormInput) {
  await requireRole('expenses:manage');
  const parsed = expenseSchema.parse(input);   // amount_cents > 0, category enum, date
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from('expenses').insert({
    ...parsed, created_by: (await requireUser()).user.id,
  }).select('id').single();
  if (error) throw mapDbError(error);
  await logAudit('expenses.create', data.id, { amount_cents: parsed.amount_cents, category: parsed.category });
  revalidatePath('/expenses');
}
```

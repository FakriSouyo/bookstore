---
name: bookstore-books
description: Book catalog module — CRUD services and UI for the Bookstore Management & POS app: book model fields, slug/ISBN/barcode rules, the tabbed book form, server-paginated list with filters, detail page, and soft-delete rules. Uses bookstore-image-upload for covers and bookstore-inventory for all stock display.
---

# Purpose

Define the book catalog module: how books are created, read, updated, archived, listed, searched, and validated. Books are the heart of the store — everything else (inventory, purchases, sales, reports) references them.

# Scope

- Book data model usage (fields are defined in `bookstore-database`; this skill defines their meaning and rules).
- ISBN and barcode validation.
- Slug generation and uniqueness.
- Book service (`lib/services/books.ts`) and server actions.
- Book form (tabbed sections) and validation.
- Book list (server-paginated, searchable, filterable, sortable) and responsive card view.
- Book detail page.
- Status lifecycle and soft-delete (archive) rules.

Out of scope: cover images (see `bookstore-image-upload`), stock values and adjustments (see `bookstore-inventory`), pricing/totals (see `bookstore-core` conventions + `lib/pricing`).

# When to Use

Any task touching the catalog: book CRUD pages, book search anywhere (POS reuses the search service), ISBN handling, barcode handling, status changes, or the book form. If the task also changes stock or images, pair with `bookstore-inventory` / `bookstore-image-upload`.

# Architecture

## Field rules (from `bookstore-database`)

| Field | Rule |
| --- | --- |
| `title` | Required, trimmed, max 300 chars. |
| `author` | Required (default `''` allowed only during DRAFT-style entry — choose: required with default `'Unknown'`). |
| `isbn` | Optional but validated: ISBN-10 or ISBN-13 with checksum (see below). Unique when present. |
| `barcode` | Optional; usually mirrors ISBN or EAN-13. Unique when present. |
| `slug` | Generated from `title` + disambiguator, unique, lowercase, kebab-case. Never user-editable. |
| `purchase_price_cents` / `selling_price_cents` | Integer cents, `>= 0`, selling price may be 0 for unlisted items but UI warns. |
| `stock` / `minimum_stock` | Read-only display of stock (source: `books.stock` maintained by the inventory engine). `minimum_stock` is editable and drives low-stock alerts. |
| `status` | `ACTIVE` (sellable, appears in POS), `INACTIVE` (hidden from POS, still in history), `ARCHIVED` (soft-deleted). |
| `category_id` / `publisher_id` | Optional FK; when set, the referenced row must exist and be active. |

## ISBN validation

`lib/utils/isbn.ts`:

- Accept `978/979` ISBN-13 (13 digits, check digit mod 10) and ISBN-10 (10 chars, check digit 0–9 or X, mod 11).
- Normalize input (strip spaces/hyphens) before validating.
- On create/update, store the normalized form; reject invalid ISBNs with `VALIDATION_ERROR` and a helpful message. Do not silently "fix" the ISBN.
- If both ISBN and barcode are provided, they may be equal; the app does not force them to match (some editions have separate barcodes).

## Slug

`slugify(title)` in `lib/utils/slug.ts`: lowercase, strip accents/punctuation, collapse whitespace to `-`, fallback to `book-<short-uuid>` if empty. On conflict, append `-2`, `-3`, … (unique constraint enforced by the DB; service retries with suffix on `unique_violation`).

## Status lifecycle

- `ACTIVE ⇄ INACTIVE` — any user with `books:update`.
- → `ARCHIVED` — `books:delete` permission; archive = soft delete:
  - Allowed at any time. The book disappears from POS/search but its rows in `sale_items`, `purchase_items`, and `stock_movements` remain untouched.
  - **Hard delete** is allowed only when the book has zero movements, zero sale/purchase items, and no images — otherwise it is a historical record. Never hard-delete by default.
  - Archiving does not change stock. To retire stock first, use `bookstore-inventory` (ADJUSTMENT_OUT/DAMAGE) before archiving.
- `ACTIVE` with `stock == 0` is allowed (out of stock but sellable once restocked); POS blocks selling it anyway.

## Services and actions

`lib/services/books.ts` exposes:

- `listBooks({ page, pageSize, search, categoryId, publisherId, status, sort })` — server-paginated, joins `categories(name)`, `publishers(name)`, and the primary cover URL; search across `title`/`author`/`isbn`/`barcode` (GIN trigram index). Cashiers see only a reduced column set (no purchase price).
- `getBook(id)` — detail with images, category/publisher.
- `createBook(input)`, `updateBook(id, input)`, `archiveBook(id)`, `activateBook(id)` — each: `requireRole` (create/update: `books:create`/`books:update`; archive: `books:delete`), zod-validate, write, audit (`books.create`, `books.update`, `books.archive`), `revalidatePath`.

Server actions in `app/(app)/books/actions.ts` wrap these for forms.

# Rules

1. Books are never hard-deleted if they have history or images (see status lifecycle).
2. ISBN/barcode uniqueness is enforced by the database; the UI surfaces the conflict as `This ISBN is already in use`.
3. Prices are integers in cents; forms convert via `MoneyInput` (see `bookstore-ui`).
4. Stock is never edited from the book form or list — it is display-only. Adjustments go through `bookstore-inventory`.
5. Cashiers must not see `purchase_price_cents` or profit-related data: queries for `sales:view_own`-only roles exclude those columns.
6. Slug is generated server-side; the client never submits it.
7. Book form preserves input on validation failure (see `bookstore-ui`).

# Implementation Guidance

## Book form (`/books/new`, `/books/[id]`)

Tabbed layout (`bookstore-ui` rules; on mobile, tabs become stacked sections):

1. **Basic Information**: title, author, ISBN, barcode, category (Select), description (TextArea).
2. **Publishing**: publisher (Select), publication year (InputNumber), edition, language.
3. **Pricing**: purchase price (OWNER/ADMIN only — hidden for cashiers), selling price, (markup hint showing expected margin).
4. **Inventory**: minimum_stock, location; stock display-only with a link to the inventory page.
5. **Images**: the `BookImageManager` component (see `bookstore-image-upload`).

Submit: server action validates with the zod schema, returns `{ ok, bookId }` or `{ error: AppError }`; UI shows success message and navigates to the detail page.

## Book list (`/books`)

- Toolbar: `Input.Search` (debounced 300ms), `Select` category, `Select` publisher, `Select` status, sort control.
- Server-paginated `ResponsiveTable` (see `bookstore-responsive`): desktop columns `Cover | Title | ISBN | Category | Publisher | Purchase Price (role-gated) | Sale Price | Stock | Status | Actions`; mobile card shows cover, title, ISBN, stock badge, sale price, status, "More" action.
- Stock cell: red when `stock <= minimum_stock`, amber when `stock <= minimum_stock * 1.5` (visual aid only — the report is authoritative).
- Row actions: View, Edit (`books:update`), Archive (`books:delete`, `Popconfirm`), and a quick "Sell in POS" link for ACTIVE books (`pos:operate`).
- Empty state with "Add your first book" CTA.

## Book detail (`/books/[id]`)

`Descriptions` for metadata + cover gallery (`Image.PreviewGroup`) + stock summary card + recent movements preview (5 rows, via `bookstore-inventory` read) + related sale/purchase counts.

# Security

- Read scoping: purchase price is excluded for roles without `purchases:view`/profit visibility; enforce in the query.
- Write authorization in every server action (`books:create`/`books:update`/`books:delete`).
- RLS on `books` lets authenticated users read ACTIVE books (POS/search needs it for cashiers) but only OWNER/ADMIN update — see `bookstore-security` for exact policies.
- Archive does not delete images automatically unless explicitly chosen and confirmed (see `bookstore-image-upload`); deleting images is a separate audited action.

# Performance

- List queries use the GIN trigram index for search; paginate server-side (`range` + `count`).
- Cover thumbnails: `next/image` with fixed sizes; primary cover joined via a correlated subquery or `book_images` lookup (avoid N+1: fetch images for the page's ids in one query).
- Detail page: one aggregate query for `stock`, one for images, one for movement preview.

# Testing

- Unit: ISBN checksum validation (valid/invalid ISBN-10/13, normalization), slug generation + collision suffix, archive rules (allowed/blocked states).
- Integration: create/update/archive via service with permission checks; uniqueness conflicts map to friendly errors.
- E2E: create a book with images → appears in list → archive → gone from POS search, history intact.
- See `bookstore-testing` for the suite layout.

# Common Mistakes

- Hard-deleting books that appear in old sales (breaks history and reports).
- Letting the client pick the slug or trusting ISBN format.
- Editing stock from the book form.
- Showing purchase price to cashiers.
- Search hitting `ilike '%..%'` without the trigram index on big catalogs.
- One giant book form with every field visible (violates `bookstore-ui` form rules).
- Forgetting `revalidatePath` after mutations → stale lists.

# Examples

**Create book server action (abridged):**

```ts
'use server';
export async function createBook(input: BookFormInput) {
  await requireRole('books:create');
  const parsed = bookCreateSchema.parse(input);          // zod: title required, isbn checksum, cents ≥ 0
  const slug = await uniqueSlug(parsed.title);           // lib/utils/slug.ts
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from('books')
    .insert({ ...parsed, slug, stock: 0 })
    .select('id').single();
  if (error) throw mapDbError(error);                    // unique isbn/slug → friendly AppError
  await logAudit('books.create', data.id, { title: parsed.title });
  revalidatePath('/books');
  return { ok: true, bookId: data.id };
}
```

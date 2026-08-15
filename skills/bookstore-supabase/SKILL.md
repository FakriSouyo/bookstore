---
name: bookstore-supabase
description: How to use Supabase in the Bookstore Management & POS app — server/browser/admin clients, env vars, query patterns, RPC calls, Storage wrapper, types generation, migrations, and local development workflow. Pairs with bookstore-database (schema) and bookstore-security (RLS).
---

# Purpose

Define the standard way this application talks to Supabase (Postgres, Auth, Storage): which client to use where, how queries and mutations are structured, how RPC functions are called, how storage is wrapped, and how migrations and types are managed. Every data access in the app follows these patterns.

# Scope

- Client architecture: `lib/supabase/server.ts`, `lib/supabase/browser.ts`, `lib/supabase/admin.ts`.
- Environment variables and their exposure rules.
- Query patterns for Server Components, client components, server actions, and route handlers.
- Calling the RPC functions defined in `bookstore-database`.
- Storage wrapper for book images (`lib/supabase/storage.ts`).
- Type generation (`types/database.ts`) and migration workflow.
- Local development (Supabase CLI) and seeding rules.

Out of scope: schema (see `bookstore-database`), RLS policy definitions (see `bookstore-security`), auth flows (see `bookstore-auth`), image pipeline details (see `bookstore-image-upload`).

# When to Use

Every time you write code that reads from or writes to Supabase, call an RPC, or touch storage. Before writing a raw `supabase.from(...)` call, check this skill for the right client and pattern.

# Architecture

## Environment variables

| Variable | Where | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | `.env.local` + client bundles | Project URL (safe to expose) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `.env.local` + client bundles | Anon key — safe only because RLS gates everything |
| `SUPABASE_SERVICE_ROLE_KEY` | `.env.local`, server-only | Service role — **never** in `NEXT_PUBLIC_*`, never imported in client components |

Rules: the service key only ever appears in `lib/supabase/admin.ts` (marked `import 'server-only'`). The anon key is safe to expose **only** because every table has RLS (see `bookstore-security`). If RLS is missing on a table, the anon key is a data leak.

## Clients

```ts
// lib/supabase/server.ts — Server Components, server actions, route handlers (read session from cookies)
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export function createSupabaseServerClient() {
  const cookieStore = cookies();
  return createServerClient(url, anonKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); }
        catch { /* called from Server Component — middleware refreshes instead */ }
      },
    },
  });
}

// lib/supabase/browser.ts — client components
import { createBrowserClient } from '@supabase/ssr';
export const supabaseBrowser = () => createBrowserClient(url, anonKey);

// lib/supabase/admin.ts — server-only, service role (bypasses RLS — use only where authorized, e.g. user creation)
import 'server-only';
import { createClient } from '@supabase/supabase-js';
export const supabaseAdmin = () => createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
```

Guidelines:

- **Server Components** query with the server client (user-scoped via session + RLS). Never use the admin client for app data reads.
- **Client components** read/write through server actions or route handlers. Direct browser-client mutations are allowed only for simple, RLS-covered reads (e.g., reading own profile); anything with business rules goes through a service on the server.
- **Admin client** is used only for: creating users (invites), password resets, and rare owner-only maintenance. Every use must be in a server action/route with `requireRole('OWNER')` (see `bookstore-auth`).
- Wrap all admin-client calls in `try/catch` and map errors to `AppError` (see `bookstore-core`).

## Query patterns

### Reads in Server Components

```tsx
// app/(app)/books/page.tsx
const supabase = createSupabaseServerClient();
const { data, count } = await supabase
  .from('books')
  .select('id, title, isbn, selling_price_cents, stock, status, categories(name)', { count: 'exact' })
  .eq('status', 'ACTIVE')
  .ilike('title', `%${search}%`)
  .order('title', { ascending: true })
  .range((page - 1) * pageSize, page * pageSize - 1);
```

- Always server-side paginate lists (`range` + `count: 'exact'`); never `select('*')` for lists; never fetch whole tables into the browser.
- Use explicit column lists; join display fields (`categories(name)`).
- Sorting: default `created_at desc` for sales/purchases/movements; allow limited user-chosen sorts that map to indexes.

### Mutations

All mutations live in services (`lib/services/*.ts`) called from server actions or route handlers. Pattern:

```ts
export async function createBook(input: BookCreateInput) {
  requireRole('books:create');                    // authz (bookstore-auth)
  const parsed = bookCreateSchema.parse(input);   // validation (zod)
  const { data, error } = await supabaseAdmin()   // or server client when RLS allows
    .from('books').insert({ ...parsed, slug: slugify(parsed.title) }).select().single();
  if (error) throw mapDbError(error);             // → AppError, never raw
  await logAudit('books.create', data.id);        // bookstore-audit
  return data;
}
```

- **Never** trust client-supplied prices/stock/totals: recompute authoritative values server-side (see `lib/pricing` + RPCs in `bookstore-database`).
- Every mutation returns typed data or throws `AppError`; UI maps codes to messages.

### RPC calls

Stock/sale/purchase-critical writes go through Postgres functions (`create_sale`, `receive_purchase`, `adjust_inventory`, `void_sale`, `refund_sale`) so they are atomic and re-validated in the database:

```ts
const { data: saleId, error } = await supabase.rpc('create_sale', {
  p_items: cartItems.map(i => ({ book_id: i.bookId, quantity: i.quantity })),
  p_payment_method: 'CASH',
  p_tendered_cents: tenderedCents,
  p_discount_cents: discountCents,
});
if (error) throw mapRpcError(error); // NEGATIVE_STOCK → AppError('BUSINESS_RULE', ...)
```

`mapRpcError` in `lib/utils/errors.ts` maps the symbolic exceptions raised by the functions (see `bookstore-database`) to `AppError` codes. Never display the raw `error.message` from a failed RPC.

## Storage

`lib/supabase/storage.ts` wraps the `book-covers` bucket (see `bookstore-image-upload` for the full pipeline):

```ts
export const BOOK_COVERS_BUCKET = 'book-covers';
export function bookCoverPath(bookId: string, fileName: string) {
  return `books/${bookId}/${fileName}`;   // safe names only — see bookstore-image-upload
}
export async function uploadBookImage(file: File, path: string) {
  const { error } = await supabaseBrowser().storage.from(BOOK_COVERS_BUCKET).upload(path, file, {
    cacheControl: '3600', contentType: file.type, upsert: false,
  });
  if (error) throw mapStorageError(error);
  return supabaseBrowser().storage.from(BOOK_COVERS_BUCKET).getPublicUrl(path).data.publicUrl;
}
export async function deleteBookImage(path: string) {
  const { error } = await supabaseBrowser().storage.from(BOOK_COVERS_BUCKET).remove([path]);
  if (error) throw mapStorageError(error);
}
```

- Bucket policies (who may upload/delete) are enforced in `bookstore-security`; the client can only do what RLS/storage policies allow.
- Always store the bucket-relative `storage_path` in `book_images` (never the full URL) and derive display URLs, so bucket/domain changes don't corrupt metadata.

## Types

- `types/database.ts` is generated: `supabase gen types typescript --local > types/database.ts` (or `--linked` for the remote project). Commit it.
- Re-generate after every migration; type drift is a build error.
- Domain types (`types/books.ts`, `types/sales.ts`, ...) layer app-level shapes (form inputs, cart items, receipt payloads) on top of the generated row types. Do not hand-maintain database row types.

## Migrations and local dev

- Schema changes are written in `supabase/migrations/` per `bookstore-database`; applied via `supabase db push` (remote) or `supabase db reset` (local).
- Local dev: `supabase start` (Postgres + Auth + Storage + Studio). Seed `supabase/seed.sql` with dev-only data (demo users, sample categories) — **never** production data, and never mock data in app code.
- Tests use the local instance (see `bookstore-testing`).
- Do not run destructive SQL against the remote project outside of a reviewed migration.

# Rules

1. Server Components/actions use the cookie-based server client; the browser client is for interactive UI; the admin client is server-only and never exposed.
2. The service-role key never appears in `NEXT_PUBLIC_*` or in client bundles.
3. All list reads are paginated and column-limited; no whole-table fetches.
4. Mutations validate (zod), authorize (`requireRole`), execute via a service, and map errors to `AppError`.
5. Critical writes go through RPCs, not multi-step client queries.
6. Storage paths are generated (never user filenames); metadata stores paths, not transient URLs.
7. Types are regenerated from the schema and committed with schema changes.

# Implementation Guidance

1. **Set up**: install `@supabase/supabase-js`, `@supabase/ssr`, add the env vars (see Architecture), and create the three clients. Verify `supabase start` works locally before any feature work.
2. **New read**: write it as a Server Component query with explicit columns + pagination; if it needs to be interactive, expose it through a server action or route handler — not a raw browser-client query with business rules.
3. **New mutation**: zod schema → `requireRole` → service function → RPC or table write → `logAudit` → `revalidatePath` (follow the examples in this file and in `bookstore-auth`).
4. **New RPC dependency**: confirm the function exists in `bookstore-database` migrations first; call it via `supabase.rpc` with a typed `p_` argument object and map errors with `mapRpcError`.
5. **Schema change**: migration → `supabase db reset`/`db push` → regenerate types → commit both.
6. **Storage op**: always go through `lib/supabase/storage.ts` (path generation + wrappers), never raw `storage.from(...)` calls scattered in components.

# Security

- RLS is the backstop: the anon key is safe only because every table is locked down (`bookstore-security`). Never add a table without RLS.
- The admin client bypasses RLS — every call through it must be gated by `requireRole` and audited.
- Never `select` columns the caller shouldn't see (e.g., `purchase_price_cents` for cashiers) — hide at query level, not just in UI.
- Storage upload/delete respects bucket policies; server-side validation also checks MIME/size (see `bookstore-image-upload`).

# Performance

- Prefer RPC/views for aggregations (dashboard, reports) instead of pulling rows into JS.
- Reuse a single supabase client instance per request (module-level factory per request is fine; avoid creating clients in tight loops).
- `select` joined display columns only; avoid N+1 by fetching the list once and mapping.
- Pagination everywhere; `count: 'exact'` only where totals are displayed.

# Testing

- Integration tests run against local Supabase: RPC behavior (atomicity, negative stock), RLS role matrix, storage policy checks. See `bookstore-testing`.
- Unit tests cover `mapDbError`/`mapRpcError` mappings and storage path generation.

# Common Mistakes

- Using the admin client in a Server Component for normal reads (bypasses RLS silently).
- `NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY` — a critical leak.
- Not mapping Supabase errors → users see `Database error saving changes` or worse.
- Client-side multi-step writes that should be one RPC (partial failure leaves inconsistent stock).
- Missing `count: 'exact'` and `range` → unbounded queries.
- Hand-writing database types instead of regenerating them.
- Storing `url` from `getPublicUrl()` and never the `storage_path`, breaking future moves.
- Forgetting that the browser client reflects RLS, and "it worked in Studio" (service role) ≠ it works for a cashier.

# Examples

**Server action for stock adjustment (inventory page):**

```ts
'use server';
export async function adjustStock(input: { bookId: string; quantity: number; movementType: string; notes?: string }) {
  const parsed = adjustSchema.parse(input);
  requireRole('inventory:adjust');
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc('adjust_inventory', {
    p_book_id: parsed.bookId, p_quantity: parsed.quantity,
    p_movement_type: parsed.movementType, p_notes: parsed.notes ?? null,
  });
  if (error) throw mapRpcError(error);
  await logAudit('inventory.adjust', parsed.bookId, { quantity: parsed.quantity, movementType: parsed.movementType });
  revalidatePath('/inventory');
}
```

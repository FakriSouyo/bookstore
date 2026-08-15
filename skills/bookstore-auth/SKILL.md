---
name: bookstore-auth
description: Authentication, sessions, and role-based access control for the Bookstore Management & POS app — Supabase Auth setup, login/logout/password reset, protected routes, the central permission matrix, role guards, and user management. Pairs with bookstore-security for RLS enforcement.
---

# Purpose

Define how the application authenticates users (Supabase Auth) and authorizes actions (a central permission system). Login, session persistence, protected routes, role-based access, password reset, and user management — with the rule that **server-side authorization is mandatory** and client checks are only UI polish.

# Scope

- Auth setup (email/password, sign-up disabled, invites).
- Session handling with `@supabase/ssr` (middleware + cookies).
- Protected routes and role guards (`requireUser`, `requireRole`).
- Login / forgot-password / reset-password pages.
- Logout.
- The central permission matrix in `lib/permissions` (`can`, `usePermission`, permission set).
- User management (create, activate/deactivate, change role) — OWNER only.
- Profile bootstrap and RLS on `profiles`.

Out of scope: RLS policies for other tables (see `bookstore-security`), Supabase client mechanics (see `bookstore-supabase`), session cookie plumbing details (see `bookstore-supabase`).

# When to Use

Any task that involves a login page, route protection, a role check, a permission gate, user administration, or password flows. Whenever you are tempted to write `if (user.role === 'ADMIN')` inside a component, stop and use the permission system defined here instead.

# Architecture

## Auth model

- **Supabase Auth, email/password only.** Provider sign-ins (Google etc.) are out of scope for an internal system.
- **Sign-up is disabled** (Supabase auth config: `enable_signup = false`). New users are created by the OWNER via the admin client with `email_confirm: true`, then the user sets a password through the reset flow. This keeps the user list under control.
- Session is stored in cookies via `@supabase/ssr`; middleware refreshes the session and enforces route protection.

## Routes

```
(auth)/login            → public (redirects to /dashboard when already signed in)
(auth)/forgot-password
(auth)/reset-password
(app)/…                 → protected; every route under (app) requires a valid session
```

## Middleware

```ts
// middleware.ts
import { updateSession } from '@/lib/supabase/middleware';
export async function middleware(request: NextRequest) {
  return await updateSession(request);   // refresh token + redirect to /login when unauthenticated
}
export const config = { matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'] };
```

Route-level role gating is **not** done in middleware (roles change rarely, and page-level checks are clearer). The `(app)` layout calls `requireUser`; individual pages call `requireRole(permission)`.

## Protected layout

```tsx
// app/(app)/layout.tsx
export default async function AppLayout({ children }) {
  const user = await requireUser();              // redirects to /login if no session
  return <AppShell user={user}>{children}</AppShell>;
}
```

## The permission system (single source of truth)

`lib/permissions/permissions.ts` defines the full permission set and the role matrix:

```ts
export type Permission =
  | 'books:read' | 'books:create' | 'books:update' | 'books:delete'
  | 'categories:manage' | 'publishers:manage' | 'suppliers:manage'
  | 'inventory:read' | 'inventory:adjust'
  | 'purchases:view' | 'purchases:create' | 'purchases:update' | 'purchases:receive'
  | 'pos:operate'
  | 'sales:view_own' | 'sales:view_all' | 'sales:void' | 'sales:refund'
  | 'receipt:print'
  | 'expenses:view' | 'expenses:manage'
  | 'reports:view'
  | 'users:manage' | 'settings:manage' | 'audit:view';

export const ROLE_PERMISSIONS: Record<AppRole, Permission[]> = {
  OWNER:   [...ALL_PERMISSIONS],
  ADMIN:   [...ALL_PERMISSIONS.filter(p => !['users:manage', 'settings:manage', 'audit:view'].includes(p))],
  CASHIER: ['books:read', 'inventory:read', 'pos:operate', 'sales:view_own', 'receipt:print'],
};

export function can(role: AppRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}
```

Usage:

- **Server**: `requireRole('inventory:adjust')` (throws `AppError('AUTHZ_ERROR')`), and `hasRole('sales:view_all')` for boolean checks. These live in `lib/auth/guards.ts` and read the profile from the session/DB.
- **Client**: `usePermission('pos:operate')` (hook over the session profile) to show/hide UI. Client checks are convenience only.

Scoping note: `sales:view_own` limits a cashier's sales list to `sales.cashier_id = user.id`. Views with `sales:view_all` (ADMIN/OWNER) see everything. Implement scoping in the query, not by filtering in the UI.

## Guards

```ts
// lib/auth/guards.ts
export async function requireUser() {
  const supabase = createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('role, full_name').eq('id', user.id).single();
  return { user, profile };          // profile.role drives permissions
}

export async function requireRole(permission: Permission) {
  const { profile } = await requireUser();
  if (!can(profile.role, permission)) throw new AppError('AUTHZ_ERROR', 'You do not have permission for this action.');
}
```

## Auth pages

- **Login**: AntD `Form` (email + password), `message.error` on failure with a safe message (`Invalid email or password`), loading on submit, link to forgot-password. On success `router.push('/dashboard')` + `router.refresh()`.
- **Forgot password**: email input → `supabase.auth.resetPasswordForEmail(email)` → success state with guidance.
- **Reset password**: `supabase.auth.updateUser({ password })` (page reads the session from the recovery link), then sign-in. Require a minimum password strength (≥ 8 chars, mixed) and validate client + server.
- **Logout**: `supabase.auth.signOut()` then redirect to `/login`.

## User management (OWNER only, `/users`)

- List users with role, active status, last activity (from `profiles` + `auth.admin.listUsers` where needed).
- Create user: `supabaseAdmin().auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name } })` — the trigger in `bookstore-database` creates the `profiles` row.
- Edit: change `full_name`, `role`, `phone` on `profiles`; deactivate by setting `is_active = false` (and revoke sessions via `admin.signOut(userId)` or the user's next auth check rejects `!is_active`).
- **Role changes and deactivations are audit-logged** (`logAudit('users.role_change', ...)`, `logAudit('users.deactivate', ...)`).
- Changing your own role is forbidden (a safety check; the OWNER should manage roles from another account or deliberately).

# Rules

1. Server-side authorization is mandatory. Client `usePermission` gates are never the only protection.
2. All permission logic lives in `lib/permissions`; `can()` is the only place role→permission mapping exists.
3. Sign-up is disabled; user creation is OWNER-only via the admin client, and audited.
4. Every route under `(app)` requires a session; sensitive routes/pages additionally call `requireRole`.
5. Deactivated users cannot use the app (server checks `is_active`).
6. Password resets go through Supabase's email flow; never log or store passwords.
7. Do not expose profile details (phone, role change history) beyond what the caller's permission allows.
8. `profiles` rows are protected by RLS (users read/update their own; ADMIN/OWNER read all; role updates are OWNER-only — see `bookstore-security`).

# Implementation Guidance

1. **Login page** → `(auth)/login/page.tsx` using `createSupabaseServerClient()` in a server action, `signInWithPassword`.
2. **Middleware** → wire `updateSession` from `@supabase/ssr` as above.
3. **Profile fetch** → add a `useUser` client hook backed by a server-side fetch (server component passes `{ user, profile }` down via a React context or `cache()`), so permission hooks don't re-query per component.
4. **Guard every mutation** with `requireRole` at the top of the server action (see `bookstore-supabase` examples).
5. **User management UI** at `/users` (OWNER-only page guard), with role `Select`, activate/deactivate `Switch` with `Popconfirm`, and audit trail link.

# Security

- The anon key + RLS handle table-level access; auth handles identity; permissions handle capability. All three layers must agree (see `bookstore-security` for the RLS side).
- The admin client used for user creation bypasses RLS — calls are gated by `requireRole('users:manage')` and audited.
- Protect against session fixation: after password reset, force re-login; after role change, the new role takes effect on next request (no caching of stale roles beyond the request).
- Never return `auth` internal errors verbatim (e.g., `User already registered` → friendly message).
- Rate-limit login attempts at the Supabase/edge level or note it in the security review; don't build custom auth logic.

# Performance

- Fetch the profile once per request (server) and share via context; avoid per-component `getUser()` calls.
- Cache `can()` lookups in a single request; the matrix is a static constant.
- User list paginates server-side; don't `admin.listUsers` for the whole org in one call.

# Testing

- Unit: `can()` matrix tests for every role × permission (see `bookstore-testing`).
- Integration: profile trigger creates a row on user creation; RLS on `profiles` allows self-read, blocks role tampering by cashiers; deactivated user is rejected.
- E2E: login → dashboard; wrong password → friendly error; logout; password reset flow (against local Supabase email mock).
- Permission E2E: a CASHIER user cannot reach `/users` or `/audit-logs` (redirect/403), cannot void a sale.

# Common Mistakes

- Checking roles inline (`user.role === 'ADMIN'`) scattered through components instead of the matrix.
- Client-only authorization ("the menu item is hidden, so it's safe").
- Leaving sign-up enabled for an internal app.
- Not checking `is_active` (deactivated user keeps access).
- Storing/handling passwords outside Supabase Auth.
- Admin-client user creation without OWNER gating or audit.
- Middleware rejecting everything or nothing (matcher gaps) — check the matcher covers `(app)` routes.

# Examples

**Server action: create user (OWNER only):**

```ts
'use server';
export async function inviteUser(input: { email: string; fullName: string; role: AppRole }) {
  await requireRole('users:manage');
  const parsed = inviteUserSchema.parse(input);
  const { data, error } = await supabaseAdmin().auth.admin.createUser({
    email: parsed.email, password: generateTempPassword(), email_confirm: true,
    user_metadata: { full_name: parsed.fullName },
  });
  if (error) throw mapAuthError(error);
  await supabaseAdmin().from('profiles').update({ role: parsed.role }).eq('id', data.user.id);
  await logAudit('users.create', data.user.id, { role: parsed.role });
  return { ok: true };
}
```

**Conditional UI:**

```tsx
const canVoid = usePermission('sales:void');
// render the Void action only when canVoid; the server action enforces it regardless
```

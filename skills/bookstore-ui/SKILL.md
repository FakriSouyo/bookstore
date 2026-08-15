---
name: bookstore-ui
description: UI conventions for the Bookstore Management & POS app — design tokens, Ant Design theming, layout shell, tables, forms, feedback, and the loading/empty/error state rules. Use for every UI change. Pairs with bookstore-responsive for breakpoint behavior.
---

# Purpose

Define how every screen of the internal Bookstore Management & POS application looks and behaves: a minimal, modern, enterprise-grade visual system built on Ant Design, consistent across desktop, tablet, and mobile. The UI must be fast to scan, comfortable for long admin sessions, and never look like a default Ant Design demo.

# Scope

- Design tokens (color, spacing, typography, radius, shadow).
- Ant Design `ConfigProvider` theme configuration.
- Application shell (sidebar, header, breadcrumb, content, mobile bottom nav).
- Page structure and component conventions.
- Table conventions (columns, pagination, actions, responsive columns).
- Form conventions (labels, validation, sections, money inputs).
- Feedback patterns (message, notification, modal confirmation).
- Loading / success / error / empty states.
- Money and number display.
- Status tag mapping.

Out of scope: breakpoint behavior (see `bookstore-responsive`), data fetching (see `bookstore-supabase`), business logic (see module skills).

# When to Use

Every UI task: new page, new component, table, form, modal, layout change, or visual polish. Before writing JSX, check this skill for the tokens and patterns. For anything that depends on screen size, read `bookstore-responsive` first and follow its rules.

# Architecture

## Design tokens

Source of truth: `lib/theme/tokens.ts` (TS constants) feeding the AntD `ConfigProvider` theme. Do not hardcode colors in components; import tokens or use AntD semantic tokens.

| Token | Value | Usage |
| --- | --- | --- |
| Primary | `#b45309` (deep amber — bookstore/brand feel) | Primary buttons, active nav, links, focus |
| Success | `#16a34a` | Positive, stock OK, paid |
| Warning | `#d97706` | Low stock, partial states |
| Error | `#dc2626` | Errors, destructive |
| Info | `#0284c7` | Neutral information |
| Background | `#f7f6f4` | App canvas |
| Surface | `#ffffff` | Cards, tables, sheets |
| Border | `#e6e2dc` | Subtle hairlines |
| Text | `#1f1e1d` | Primary text |
| Secondary text | `#6b6865` | Secondary |
| Disabled text | `#b5b1ac` | Disabled |

Configure both AntD seed tokens and component tokens so components (buttons, tables, inputs) inherit the system:

```tsx
<ConfigProvider
  theme={{
    token: {
      colorPrimary: tokens.primary,
      colorSuccess: tokens.success,
      colorWarning: tokens.warning,
      colorError: tokens.error,
      colorInfo: tokens.info,
      colorBgLayout: tokens.background,
      colorBgContainer: tokens.surface,
      colorBorder: tokens.border,
      colorText: tokens.text,
      colorTextSecondary: tokens.secondaryText,
      borderRadius: 6,
      fontSize: 14,
      fontFamily: "'Inter', system-ui, sans-serif",
    },
    components: {
      Layout: { headerBg: tokens.surface, siderBg: tokens.surface },
      Table: { headerBg: tokens.background, headerColor: tokens.secondaryText },
      Button: { controlHeight: 36 },
      Card: { headerBg: 'transparent' },
    },
  }}
>
```

## Spacing

8px rhythm: `4, 8, 12, 16, 24, 32, 48, 64`. Standard paddings: page content `24` (desktop), `16` (mobile); card body `16–24`; gap between form items `16` vertical, `12` horizontal. Expose as `tokens.space` scale in `lib/theme/tokens.ts`.

## Typography hierarchy

| Role | Style | Used for |
| --- | --- | --- |
| Page title | 20px/600 | Page headers |
| Section title | 16px/600 | Card/group titles |
| Card title | 14px/600 | Card headers |
| Body | 14px/400 | Default content |
| Secondary | 13px/400, secondary color | Metadata, hints |
| Caption | 12px/400, secondary | Table footers, timestamps |
| Numeric KPI | 28–32px/700, tabular-nums | Dashboard KPIs, totals, change due |

Use `font-variant-numeric: tabular-nums` for all money/quantity columns so digits align in tables and receipts.

## Shape and depth

- Radius: `6px` default (AntD default), `8px` max. No pill-shaped containers except tags.
- Shadows: only where elevation is meaningful (dropdown, modal, drawer, floating action). Default card: 1px border, no shadow.
- No gradients. No oversized decorative cards. Cards have a 1px `tokens.border` border and `Surface` background.

# Rules

## Shell

- Desktop (≥ `lg`): persistent `Sider` (220–240px) + header (optional, minimal) + content. Breadcrumb under the header.
- Tablet (`md`–`lg`): collapsible sidebar (collapse to icons), content full width.
- Mobile (`< md`): no sidebar; hamburger opens a `Drawer` with the same menu; a fixed bottom navigation bar with up to 5 primary destinations (Home, POS, Books, More). See `bookstore-responsive` for exact behavior.
- Active menu item uses the primary color with a subtle left indicator; inactive items are neutral.
- Header shows: page breadcrumb (desktop/tablet), a compact user menu (name + role tag, logout), and a "New sale / Open POS" primary action when the user has `pos:operate`.

## Page structure

Every page follows:

```tsx
<PageHeader title="Books" subtitle="..." breadcrumb={[...]} actions={[<Button type="primary">New book</Button>]} />
<Card>{ /* content */ }</Card>
```

- `PageHeader` (`components/shared/PageHeader.tsx`): page title, optional subtitle, optional actions, optional breadcrumb. Sticky on mobile so actions stay reachable.
- One page = one primary task. Lists live in a `Card`; detail pages use `Card` sections; forms use `Card` or full-width layout.

## Tables

Conventions for every data table (see `bookstore-responsive` for the mobile card-list transformation):

- Use AntD `Table` with server-side pagination (`pagination={{ current, pageSize, total, showSizeChanger }}`), server-side sorting where needed, and a toolbar above the table with search `Input.Search` + filter `Select`s.
- `rowKey="id"` always. Column definitions in a typed `ColumnsType<Row>` constant outside the component.
- Actions column: `Dropdown` with "More" (…ellipsis icon) on mobile; visible icon buttons on desktop. Use `Popconfirm`/`Modal.confirm` for destructive actions.
- Money columns use `Money` component (tabular-nums, right-aligned, secondary for zero). Quantity columns use `QuantityCell` (red text when stock ≤ minimum_stock).
- Status column uses `StatusTag` (mapping below).
- Loading: `Table` with `loading` prop → skeleton. Empty: `<EmptyState title="No books yet" action={<Button>Add your first book</Button>} />` — never show a bare empty table.
- Error: inline `Result status="error"` with a retry button in the table area.

Status tag mapping (single source in `components/shared/StatusTag.tsx`):

| Domain | Value | Tag |
| --- | --- | --- |
| Book | ACTIVE / INACTIVE / ARCHIVED | green / default / red |
| Purchase | DRAFT / ORDERED / RECEIVED / COMPLETED / CANCELLED | default / blue / cyan / green / red |
| Sale | COMPLETED / VOIDED / REFUNDED / PARTIALLY_REFUNDED | green / red / orange / orange |
| Payment | PENDING / PARTIAL / PAID / REFUNDED | warning / warning / success / default |

## Forms

- Use AntD `Form` with `layout="vertical"` (labels above inputs — better on mobile and faster to scan).
- Every field: `label`, `name`, `rules` (required/pattern), and a `placeholder`. Validation feedback via `validateTrigger="onBlur"` for large forms.
- Money inputs: `InputNumber` with `prefix={currencySymbol}` and `precision={2}`, or a `MoneyInput` wrapper that converts to/from cents.
- Big forms (book form) are split into sections with `Tabs` or visually grouped `Card` sections (Basic Information / Pricing / Inventory / Publishing / Images) — never one giant overwhelming form.
- Preserve input: keep form state in the parent until submit; on validation failure, do not clear fields.
- Submit buttons: primary `type="submit"`, plus explicit Cancel. Show `loading` on submit.
- Keyboard: tab order follows visual order; Enter submits the form where expected.

## Feedback

- **Success**: `message.success(...)` for quick operations (saved, adjusted), `notification.success` for operations that end a workflow (purchase received, sale completed — also followed by receipt print).
- **Failure**: `message.error(safeMessage)` derived from `AppError` code (see `bookstore-core`); never show raw DB errors. Map codes to friendly text in `lib/utils/errors.ts`.
- **Destructive confirmation**: `Modal.confirm` with clear title, explanation of consequence, `danger` OK button, and the destructive verb ("Void sale", "Delete image"). Never `window.confirm`.
- **Loading**: buttons get `loading`; tables get `loading`; pages get `Skeleton`; full-screen operations get a centered `Spin`.
- **Empty**: `components/shared/EmptyState.tsx` with a CTA for the primary next action.
- **No `alert()`/`confirm()` anywhere.**

## Money and numbers

- `Money({ cents, currency })` — formats via `Intl.NumberFormat`, tabular-nums.
- `KpiCard` — labeled value with the Numeric KPI style, delta coloring (green up / red down).
- Totals on POS/receipts are larger and use `font-weight: 700`.

# Implementation Guidance

1. Check `bookstore-responsive` for the target breakpoints before writing any page layout.
2. Compose from the shared components in `components/shared/` and `components/layout/`; extend them rather than creating one-off layouts.
3. Add a new design token only if it does not exist; keep tokens centralized.
4. Use Tailwind only for custom spacing/layouts AntD can't express (e.g., grid tweaks); do not build a parallel design system with it.

# Security

UI security is only the surface layer: permission-gated actions in the UI (`usePermission`) must always be mirrored by server-side checks (`requireRole`) — see `bookstore-security`. Never hide sensitive data (costs, profit) from the UI if the server permits it; hide at the query level, not just visually.

# Performance

- Server components render lists; only interactive pieces are client components.
- Table columns/filters stay minimal; heavy filters live in server queries.
- Lazy-load the POS and reports routes (`next/dynamic`).
- Images use `next/image` with Supabase CDN URLs and explicit sizes.

# Testing

- Component tests for shared pieces: `StatusTag` mapping, `Money` formatting, `EmptyState` rendering.
- Visual/interaction checks are covered by Playwright E2E (see `bookstore-testing`): POS flow, a CRUD flow, and a mobile-viewport flow.

# Common Mistakes

- Hardcoding hex colors in components instead of tokens.
- Building a custom table when AntD `Table` suffices.
- Shipping a page with no empty/loading/error state.
- Using `window.confirm`/`alert`.
- Creating giant single-file forms for books.
- Over-styling: shadows, gradients, oversized radius — this app is minimal by design.
- Forgetting the mobile path entirely ("it works on desktop").

# Examples

**Page header + table page (server-paginated books):**

```tsx
<PageHeader title="Books" breadcrumb={[{ title: 'Catalog' }]} actions={[<Button type="primary" icon={<PlusOutlined />}>New book</Button>]} />
<Card bodyStyle={{ padding: 0 }}>
  <Toolbar search={search} filters={categoryFilter} />
  <Table
    rowKey="id"
    columns={bookColumns} // Money/StatusTag/actions per above
    dataSource={books}
    loading={loading}
    pagination={{ current, pageSize, total, showSizeChanger }}
    scroll={{ x: 'max-content' }} // see bookstore-responsive
  />
</Card>
```

**Money input with cents conversion:**

```tsx
<Form.Item name="selling_price_cents" label="Selling price" rules={[{ required: true }]}>
  <MoneyInput placeholder="0.00" min={0} />
</Form.Item>
```

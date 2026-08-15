---
name: bookstore-responsive
description: Responsive strategy for the Bookstore Management & POS app — exact behavior per breakpoint for the sidebar, tables, forms, POS, dashboard, navigation, modals, and drawers. Read together with bookstore-ui before building any screen.
---

# Purpose

Make the internal Bookstore Management & POS application genuinely usable on desktop, tablet, and mobile. Mobile is a first-class target: cashiers may run the POS on a phone, and the owner checks KPIs on a tablet. The rule is: **design responsive behavior, do not shrink the desktop UI.**

# Scope

- Breakpoint definitions.
- Behavior per device class for: sidebar/navigation, tables, forms, POS, dashboard, modals/drawers, book cards, page headers, action areas.
- Implementation patterns: `useBreakpoint`, `ResponsiveTable` (table ↔ card list), `ResponsivePageHeader`, `DrawerNav`, sticky action bars, touch targets, scanner-friendly inputs.
- When horizontal scrolling is acceptable (and when it is not).

Out of scope: visual tokens and components (see `bookstore-ui`), data fetching (see `bookstore-supabase`).

# When to Use

Every time you build or modify a screen. Decide the layout for all three device classes before writing JSX. If you only test on desktop, the task is not done.

# Architecture

## Breakpoints

Use AntD `Grid.useBreakpoint()` (matches AntD breakpoints):

| Name | Range | Class |
| --- | --- | --- |
| `xs` | < 576px | Mobile (phones) |
| `sm` | 576–767px | Mobile large (still phone-landscape/compact) |
| `md` | 768–991px | Tablet (portrait) |
| `lg` | 992–1199px | Tablet landscape / small desktop |
| `xl` | ≥ 1200px | Desktop |

Behavioral classes used throughout this skill:

- **Desktop** = `xl` and up (full sidebar, wide tables, large POS).
- **Tablet** = `md`–`lg` (collapsible sidebar, adaptive tables, forms in 2 columns).
- **Mobile** = `xs`–`sm` (drawer nav + bottom nav, stacked forms, card lists, mobile POS).

## Device strategy overview

| Surface | Desktop (≥1200) | Tablet (768–1199) | Mobile (<768) |
| --- | --- | --- | --- |
| Sidebar | Persistent, 220–240px, always visible | Collapsible; icon-only rail by default, expandable | Hidden; `Drawer` from hamburger |
| Bottom nav | None | None | Fixed bottom bar, ≤5 items (Home, POS, Books, More) |
| Tables | Full width, all columns | Trim to essential columns (hide low-priority cols via `responsive` prop) | Card list, never a wide table |
| Forms | Multi-column (2–3) | 2 columns | 1 column, stacked |
| POS | Two-pane: catalog (left) + cart (right) | Same, narrower | Single column: search + cart stacked; sticky total bar |
| Dashboard | Multi-column grid (3–4 cols) | 2-col grid | 1-col stacked, KPI row horizontally scrollable |
| Page header | Inline breadcrumb + actions | Inline | Compact; actions become icons or move to sticky bar |
| Modals | Centered, max 640–800px | Centered, ~90% width | Full-width bottom sheet (`width="100%"`, `style={{ maxWidth: '100%', margin: 0, top: 'auto', bottom: 0 }}` or AntD `drawer` on mobile) |

## Implementation patterns

### `useBreakpoint`

Central hook `components/layout/useBreakpoint.ts` wrapping `Grid.useBreakpoint()` and exporting `isMobile`, `isTablet`, `isDesktop`, plus the raw screens. All responsive logic in components uses this hook — never `window.matchMedia` scattered around.

### `ResponsiveTable` (critical pattern)

`components/tables/ResponsiveTable.tsx` renders:

- **≥ `md`**: AntD `Table` with the full column set.
- **< `md`**: a card list (one card per row) with the same data, showing only the high-priority fields as a scannable layout, plus a "More" action.

Columns declare priority so the same definition drives both modes:

```tsx
type ColumnPriority = 'always' | 'tablet' | 'desktop';
// 'always' → shown on card + all tables
// 'tablet' → card-visible on tablet tables, hidden on mobile cards
// 'desktop' → only wide tables
```

Example transformation — desktop columns `Book | ISBN | Category | Publisher | Purchase Price | Sale Price | Stock | Status | Actions` become a mobile card:

```
[cover thumbnail] Title            Stock badge
                  ISBN · Category  Sale price (prominent)
                  Publisher        Status tag
                                   [More ▾]
```

Rules for mobile cards:
- Cover thumbnail first (left), then title (1–2 lines, bold), then key metadata as caption rows.
- Stock is a badge; sale price is prominent (numeric KPI style).
- Low-priority fields (purchase price, publisher) move into the "More" drawer, not onto the card.
- Never truncate ISBN/barcode — allow wrap.

### Horizontal scrolling

Allowed only in exceptional cases (e.g., a deliberately wide read-only comparison table) and only on tablet; on mobile it is almost always the wrong answer — use the card list. When used, wrap in a scroll container with `scroll={{ x: 'max-content' }}` and a subtle edge fade; never let the page itself scroll horizontally.

### `ResponsivePageHeader`

- Desktop/tablet: title + breadcrumb + actions inline, right-aligned.
- Mobile: title + actions compacted (icon buttons with tooltips), and the primary action (e.g., "New sale", "New book") moves into a **sticky bottom action bar** when the page's primary interaction is a form or a list action.

### Navigation

- Sidebar menu items are the same config object for desktop and the mobile `Drawer` (single source of truth in `lib/nav.ts`).
- Mobile bottom nav: Home (`/dashboard`), POS, Books, plus "More" opening the drawer with the full menu. Icons + labels, 44px+ touch targets.
- The bottom nav is hidden on POS checkout screens (the checkout action bar replaces it) and on focused single-task screens (book form) so it never fights the primary action.

### Sticky action areas

- Forms (mobile): submit buttons pinned to the bottom (`position: sticky; bottom: 0`) with a surface background and top hairline, so "Save" is always reachable.
- POS (mobile): total + "Charge" bar pinned to the bottom.
- Provide enough bottom padding so content is never hidden behind the bar or the bottom nav.

### POS layouts

- Desktop: left pane = search + product grid (4–6 columns); right pane = cart (fixed width ~360–420px), totals, charge button.
- Tablet: same two panes, narrower catalog (2–3 columns); cart collapses behind a button if needed.
- Mobile: top = search (autofocused) + scanner input; middle = item list; bottom = sticky total + "Charge". Product picking is search-driven (see `bookstore-pos`).
- Barcode scanner: a dedicated input that stays focused; treat scanner input as keyboard input (see `bookstore-pos`).

### Tables on tablet

Use AntD column `responsive: ['md']` / `['lg']` to auto-hide low-priority columns rather than scrolling. Keep: title, stock, sale price, status, actions. Hide on mobile: purchase price, publisher, ISBN (ISBN moves to the card).

### Forms on mobile

- Single column; inputs full width; `InputNumber` with a numeric keyboard (`inputMode="decimal"`).
- Tabs become stacked sections or an accordion (`Collapse`) on mobile — thumb-reachable, no horizontal tab strip.
- Large touch targets: buttons ≥ 40px height, list rows ≥ 44px.

### Dashboard

- Desktop: 4-col KPI row + 2-col chart grid.
- Tablet: 2-col KPI row + single-column charts.
- Mobile: KPI row horizontally scrollable (snap) or 2×2 grid; charts stacked full-width; each chart card collapses to summary + expand.

### Modals and drawers

- Mobile: use `Drawer` (bottom sheet, `placement="bottom"`, `height="85%"`) for detail views and heavy forms; use `Modal` only for small confirmations, sized to content.
- Tablet/desktop: `Modal` centered, `width` 640 max for forms, 800 for wide content.
- Never render a modal wider than the viewport.

# Rules

1. No layout is complete until it is checked at all three device classes.
2. Never use desktop-only horizontal scroll as a mobile strategy for tables.
3. Every interactive element has a touch target ≥ 40px (44px preferred) on mobile.
4. Primary actions are always reachable without scrolling (sticky bar or in-viewport).
5. One source of truth for navigation config; sidebar and drawer share it.
6. Breakpoint decisions live in components via `useBreakpoint`, not in CSS media queries scattered in Tailwind classes (Tailwind may be used for minor tweaks, not layout strategy).
7. Keyboard-first features (POS scanner) must keep working on mobile — the scanner input is always focused when the POS is open.

# Implementation Guidance

1. Start from the page's primary task; decide what the user must see without scrolling on each device.
2. Build with `ResponsiveTable`, `ResponsivePageHeader`, and the sticky-bar pattern from the start — retrofitting responsiveness is expensive.
3. Test on a real mobile viewport (Playwright device emulation) before marking done.

# Security

No security surface changes by device. Note: the mobile bottom nav and drawers must respect the same permission gating as desktop menu items (see `bookstore-auth`/`bookstore-security`) — a hidden-on-desktop action must not become visible on mobile through a different nav path.

# Performance

- Card lists render the same server-paginated data as tables; no extra fetches per breakpoint.
- Mobile images smaller (`next/image` sizes prop); covers use responsive widths.
- Avoid re-rendering the whole table when breakpoint changes — memoize column sets.

# Testing

- Playwright E2E runs the POS flow and a CRUD flow at desktop (`1280×800`) and mobile (`390×844`) viewports.
- Assert: mobile shows card list not table; bottom nav present; sticky charge bar visible; no horizontal page scroll (`document.scrollingElement.scrollWidth <= innerWidth`).
- See `bookstore-testing` for the suite layout.

# Common Mistakes

- "It works on desktop" — shipping without mobile.
- Rendering the 12-column table on 390px with horizontal scroll.
- Hiding columns on mobile but not moving their data anywhere (information loss).
- Sticky bars covering content (missing bottom padding).
- Per-page media-query spaghetti instead of `useBreakpoint`.
- Making the POS unusable with a physical keyboard workflow on a phone.

# Examples

**ResponsiveTable usage:**

```tsx
<ResponsiveTable
  rowKey="id"
  columns={bookColumns}        // each col has priority: 'always' | 'tablet' | 'desktop'
  dataSource={books}
  loading={loading}
  pagination={{ current, pageSize, total }}
  cardRender={(book) => (
    <BookCard book={book} onMore={() => openBook(book.id)} />
  )}
/>
```

**Mobile bottom action bar (POS charge / form save):**

```tsx
{isMobile && (
  <div className="sticky bottom-0 border-t border-border bg-surface p-3 z-10">
    <Flex justify="space-between" align="center" gap={12}>
      <Text strong>Total: <Money cents={totalCents} /></Text>
      <Button type="primary" size="large" disabled={!canCharge} onClick={onCharge}>
        Charge
      </Button>
    </Flex>
  </div>
)}
```

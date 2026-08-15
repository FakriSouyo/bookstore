---
name: bookstore-pos
description: The point-of-sale module for the Bookstore Management & POS app — a speed-first checkout experience: catalog search, barcode scanner handling, cart, quantity and discount rules, payment and change calculation, and the atomic checkout call to create_sale. Optimized for desktop, tablet, and mobile.
---

# Purpose

Define the POS: the fastest, most reliable way for a cashier to complete a sale. It is optimized for speed (keyboard + barcode scanner), prevents overselling, and completes each transaction atomically through the sales RPC. The POS is the busiest screen in the app — every interaction is designed for low friction and zero ambiguity.

# Scope

- POS layout per device class.
- Product search (title/ISBN/barcode) and catalog grid.
- Barcode scanner input handling (scanner-as-keyboard).
- Cart operations: add, remove, change quantity, line and transaction discounts.
- Stock guards at add-time and checkout-time.
- Payment: method, cash tendered, change calculation.
- Checkout (calls `create_sale`), success state, and receipt trigger.
- Keyboard shortcuts.

Out of scope: sale persistence/history (see `bookstore-sales`), receipt printing layout (see `bookstore-receipt`), the `create_sale` RPC internals (see `bookstore-database`), stock engine (see `bookstore-inventory`).

# When to Use

Any change to the POS screen, the cart, checkout flow, scanner handling, payment modal, or POS-related keyboard behavior. If your change affects what stock or prices the cashier sees, also read `bookstore-inventory` and `bookstore-books` (search service).

# Architecture

## Layout

- **Desktop (≥ lg)**: two panes — left: search bar + product grid (4–6 columns of book cards: cover, title, price, stock badge); right: fixed-width cart panel (~380px) with items, totals, "Charge" button. Barcode/scanner input sits in the search bar and keeps focus.
- **Tablet (md–lg)**: same two panes, narrower catalog (2–3 columns).
- **Mobile (< md)**: single column — search + scanner input on top, item list, sticky bottom bar with total + "Charge" (`bookstore-responsive`). Product picking is search-driven (no grid on phones).

## State model

Cart is client state (React `useReducer` in `components/pos/CartProvider.tsx`):

```ts
type CartItem = { bookId: string; title: string; priceCents: number; quantity: number; maxStock: number };
type CartState = { items: CartItem[]; discountCents: number; paymentMethod: PaymentMethod; tenderedCents: number };
```

- `addItem`: if the book exists in the cart, increment; never exceed `maxStock` (from the search result).
- `setQuantity`, `removeItem`, `clear`.
- Discounts: transaction-level (percent or fixed amount) with the cap from `store_settings.max_discount_percent` enforced client-side for UX **and** server-side by `create_sale` (see `bookstore-database`).
- Totals computed by `lib/pricing` (`cartTotals(items, discountCents)`).

## Search and catalog

- Search input (debounced 250ms) queries the book search service server-side: title, author, ISBN, barcode (GIN trigram index). Returns ACTIVE books with `selling_price_cents`, `stock`, cover, title, author.
- Results show stock; zero-stock books are disabled in the grid and blocked on add.
- Keyboard: typing in the search box and pressing Enter adds the top result; the box stays focused (scanner wedge works with the same input).

## Barcode scanner handling

USB scanners are keyboard wedges: they type digits and send Enter. Treat them as keyboard input:

- The dedicated search/scanner input has `autoFocus` and a "scanner" affordance.
- A fast Enter after a short burst of digits is interpreted as a barcode scan: on Enter, if the input matches a barcode/ISBN pattern (≥ 8 chars, digits/`X`), resolve the book directly instead of searching; if not found, show a "Not found — check the ISBN" message and clear the input.
- Heuristic to avoid double-adds: after a successful scan, clear the input and (optionally) briefly ignore duplicate input (a 300ms debounce guard).
- Do not rely on a separate hardware mode; keyboard input must work identically.
- Mobile: the same input with `inputMode="numeric"`/`autocomplete="off"` for handheld scanner apps or manual entry.

## Checkout flow

1. Cashier taps "Charge" (desktop) or the sticky button (mobile).
2. **Payment modal** (small, desktop) / bottom sheet (mobile):
   - Method: Segmented `CASH | CARD | TRANSFER | MOBILE_MONEY | OTHER`.
   - Cash: `InputNumber` tendered with quick buttons (exact, next 10/50, "round up to 100") and a live **change** display in the numeric KPI style (`change_cents = tendered − total`; disabled until `tendered >= total`).
   - Card/other: no tendered field (change = 0).
   - Transaction discount field (percent or fixed) with the cap.
   - Summary: subtotal, discount, total.
3. Confirm → server action calls `create_sale` RPC:

```ts
'use server';
export async function checkoutSale(input: CheckoutInput) {
  const parsed = checkoutSchema.parse(input);            // zod: items, payment, tendered
  const { saleId } = await createSaleService(parsed);    // lib/services/sales.ts → supabase.rpc('create_sale', ...)
  return { saleId };
}
```

4. `create_sale` (see `bookstore-database`) recomputes prices from `books`, validates stock with row locks, creates `sales`/`sale_items`/`payments`, decrements stock via the inventory engine, and enforces the discount cap — all in one transaction. **The server never trusts cart prices.**
5. On success: clear the cart, show a success state (`Result`/notification), and trigger receipt printing for the new sale (`bookstore-receipt`). The sale page link is offered.
6. On failure: map `INSUFFICIENT_STOCK`/`NEGATIVE_STOCK`/`DISCOUNT_EXCEEDS_LIMIT`/`TENDERED_BELOW_TOTAL` to friendly `message.error`; **keep the cart intact** so the cashier can adjust and retry.

## Stock guards

- Add-time: block quantity > current stock (from search data).
- Checkout-time: the RPC is authoritative — it re-checks stock under row locks, so two cashiers selling the same last unit → one succeeds, the other gets a clear "Insufficient stock" error and can retry.
- The POS never sells below zero: if `allow_negative_stock` is somehow enabled, the RPC still enforces its rule; the UI keeps the standard no-negative behavior.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| `/` or `Ctrl+K` | Focus search/scanner |
| Enter (in search) | Add top result / resolve scan |
| `+` / `-` on a selected cart row | Increase / decrease quantity |
| `Delete` | Remove selected row |
| `F9` | Open payment modal (when cart non-empty) |
| `Escape` | Close modal / clear selection |

Document shortcuts in a small help popover; they must not interfere with the scanner input.

# Rules

1. The checkout RPC is the only writer of sales; the POS never constructs a sale client-side.
2. Prices, totals, discounts, and stock are recomputed/validated server-side — client values are UX only.
3. Selling more than available stock is impossible at the database level.
4. The cart survives failed checkouts (nothing is cleared on error).
5. Every completed sale prints/offers a receipt (`receipt:print`) and is audit-logged.
6. Cashiers operate the POS only (`pos:operate`); void/refund live in sales history with higher permissions.
7. The scanner input must behave identically whether a hardware scanner, barcode app, or keyboard produced the input.
8. No silent price overrides at the POS: a price change is a `books:update` action on the book, not a POS action (documented; no hidden per-sale price overrides).

# Implementation Guidance

1. Build the cart with `useReducer` + a provider so the payment modal and the sticky bar share state.
2. Keep the POS page a client component (interactive), but fetch the initial catalog and search results server-side (route handler or server action) to keep it fast.
3. Test scanner behavior with a scripted keystroke sequence in Playwright (see `bookstore-testing`).
4. On mobile, keep the scanner input focused: avoid `blur` on tap; use a dedicated focus-reset after each add.

# Security

- The `create_sale` RPC asserts the caller is a valid POS role internally (defense in depth) and RLS protects `sales`/`sale_items`/`payments`/`stock_movements` from direct client writes (see `bookstore-security`).
- Discount cap enforced server-side (a malicious client cannot bypass the UI).
- Cashiers never see purchase prices or profit in POS data.
- Failed attempts are not sensitive; but abuse signals (repeated `TENDERED_BELOW_TOTAL`) are visible in audit.

# Performance

- Catalog/search server-side with pagination (only ACTIVE books; GIN index).
- Cart operations are pure client state — no per-key press network calls.
- The catalog grid lazily loads covers (`next/image`, `loading="lazy"`).
- One RPC per checkout regardless of item count.

# Testing

- Unit (`lib/pricing`): cart totals, discount cap math, change calculation (including round-up).
- Integration: `create_sale` happy path (stock decremented, movements +SALE rows, snapshots correct), oversell rejection, discount cap rejection, tendered-below-total rejection, atomicity on partial failure.
- E2E (Playwright, desktop + mobile): scan/type barcode → item added; quantity change; discount; cash payment with change; checkout → receipt shown → book stock decreased on the book page; oversell blocked with a friendly error and cart intact.
- See `bookstore-testing` for suite layout.

# Common Mistakes

- Trusting the client's price or letting the cashier edit prices at checkout.
- Multi-step client sale creation (crash → sale without stock movement).
- Scanner input colliding with search (double-adds, wrong book) — no Enter guard.
- Blocking keyboard flow on mobile (no autofocus, blur on tap).
- Clearing the cart on a failed checkout (cashier loses the work).
- Overselling because add-time checks were the only check.
- No receipt trigger after success.

# Examples

**Scanner input:**

```tsx
<Input
  ref={scanRef}
  autoFocus
  autoComplete="off"
  placeholder="Scan barcode or search title / ISBN…"
  onPressEnter={() => handleScanOrSearch()}
/>
// handleScanOrSearch: looks like a barcode (≥8 digits/X)? → resolveBook(code)
// else → run search; first result is added on Enter.
```

**Change calculation (lib/pricing):**

```ts
export function computeChange(totalCents: number, tenderedCents: number): number {
  return Math.max(0, tenderedCents - totalCents);
}
```

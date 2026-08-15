---
name: bookstore-receipt
description: Thermal receipt printing for the Bookstore Management & POS app — 58mm and 80mm layouts, print CSS, browser printing via react-to-print, reprint flows, store-settings-driven content, and the PDF fallback. Receipts must work on real thermal printers.
---

# Purpose

Define how receipts are generated and printed: clean thermal layouts for 58mm and 80mm paper, printed from the browser to a USB/network thermal printer, with reprint support and a PDF fallback. The receipt is the cashier's and customer's record of the transaction — it must be correct, complete, and fast to print.

# Scope

- Receipt data model (built from a sale's stored snapshots — never live queries).
- 58mm and 80mm layouts with print CSS.
- Browser printing via `react-to-print` (thermal printer as a generic printer).
- Print / reprint flows from POS and sales history.
- PDF fallback (hand-off to `bookstore-pdf`).
- Store identity from `store_settings` (editable in `/settings`).

Out of scope: sale data (see `bookstore-sales`), the POS trigger (see `bookstore-pos`), PDF internals (see `bookstore-pdf`).

# When to Use

Any task involving receipts: printing after checkout, reprinting from sales history, receipt layout tweaks, receipt settings, or the receipt PDF. Read `bookstore-sales` (data) and `bookstore-pos` (trigger) alongside.

# Architecture

## Receipt data model

`lib/receipt/types.ts` + `buildReceiptData(sale)` server-side (from `sales` + `sale_items` + `payments` **snapshots** — reprints must match the original receipt even if books/prices changed later):

```ts
type ReceiptData = {
  store: { name: string; address?: string; phone?: string; footer?: string; width: '58' | '80' };
  sale: { invoiceNumber: string; createdAt: string; cashier: string };
  items: Array<{ title: string; quantity: number; unitPriceCents: number; lineTotalCents: number }>;
  totals: { subtotalCents: number; discountCents: number; totalCents: number };
  payment: { method: string; tenderedCents: number; changeCents: number };
};
```

- `store` comes from `store_settings` (editable in `/settings` — see below).
- For VOIDED/REFUNDED sales, the receipt renders the current status line prominently ("VOIDED — {reason}" / "REFUNDED — {amount}") but otherwise keeps the original contents (it is the historical record).

## Layout (shared between browser print and PDF fallback)

- **Widths**: 58mm content ≈ 165pt (48mm printable ≈ 136pt), 80mm ≈ 226pt. The `width` setting drives `@page` size and the receipt container width.
- Structure, top to bottom:
  1. Store name (centered, bold, larger).
  2. Address + phone (centered, small).
  3. Hairline.
  4. Invoice number, date/time, cashier (small, monospaced-ish).
  5. Hairline.
  6. Items: `Title` (wrapped, left) / `qty × price` then line total (right-aligned). Title truncation is avoided — wrap instead.
  7. Totals block: Subtotal, Discount (−), Total (bold, larger).
  8. Payment lines: Method, Tendered, Change (Change in the numeric-KPI style).
  9. Footer message (from settings, e.g., "Thank you for shopping at {store}! No returns after 7 days.").
  10. Cut marks: `^C`-style gutter line is unnecessary — use a dashed bottom rule and the printer's auto-cut; keep a blank row at the end so content isn't clipped.

## Print CSS

`components/receipt/ReceiptPrint.css` with a dedicated print stylesheet:

```css
@media print {
  @page { size: 80mm auto; margin: 0; }        /* or 58mm */
  body * { visibility: hidden; }
  #receipt-print, #receipt-print * { visibility: visible; }
  #receipt-print { position: absolute; left: 0; top: 0; width: 80mm; }
}
```

- `font-family: monospace` for item lines and numbers (thermal printers render monospace reliably; proportional fonts look broken on cheap 58mm printers).
- No page margins; the printer driver handles the feed. Avoid images/graphics on thermal receipts (bandwidth + print speed).
- When the browser dialog is used, `react-to-print` triggers `window.print()` on the hidden receipt node.

## Components

- `components/receipt/ReceiptPreview.tsx` — on-screen preview (proportional font, matches the print layout at reduced scale) shown in the print modal.
- `components/receipt/ReceiptPrint.tsx` — the printable node (`id="receipt-print"`), rendered off-screen, used by `react-to-print`.
- Print modal (desktop) / bottom sheet (mobile): buttons **Print** (browser print → thermal driver), **Save PDF** (calls the PDF fallback route), **Done**. The modal opens automatically after checkout (`bookstore-pos`).

## Reprint

- From sale detail (`bookstore-sales`) and the sales list row action: rebuild `ReceiptData` from the stored sale and open the same print modal. Requires `receipt:print` (cashiers can reprint their own sales; ADMIN/OWNER any).
- Reprints are audit-logged (`receipt.print` with sale id).

## PDF fallback

- `GET /api/receipts/[saleId]/pdf` → `requireRole('receipt:print')` + view scope → `receiptPdf(receiptData)` from `bookstore-pdf` → streams a single-page PDF sized to the configured width.
- Used for: "Save PDF", and as a graceful fallback when printing fails (show the error + offer PDF).

## Settings integration

`/settings` (OWNER-only) edits `store_settings`: store name, address, phone, receipt footer, receipt width (`58`/`80`). Changes take effect on the next receipt — no cache beyond the request. Settings edits are audit-logged (`settings.update`).

# Rules

1. Receipts render from stored snapshots only — never live prices/titles.
2. `react-to-print` is the only printing mechanism; no raw `window.print()` of the whole page.
3. The receipt layout is data-driven from `store_settings`; never hardcode the store name.
4. 58mm and 80mm are both supported and switchable; the layout must be verified at both widths.
5. Monospace, small font, no images, no page margins — thermal printers are unforgiving.
6. VOIDED/REFUNDED receipts are clearly marked; the original contents are preserved.
7. Reprints are audited; printing is permission-gated (`receipt:print`).
8. Cashiers may print only their own sales unless they hold `sales:view_all`.

# Implementation Guidance

1. Build `buildReceiptData` in the service layer; components receive the prepared object (testable, no DB in components).
2. Wrap the printable node with `react-to-print` (`useReactToPrint`); hide it visually (`position: fixed; left: -10000px`) outside print.
3. Use `ReceiptPreview` in the modal so the cashier can confirm before wasting paper.
4. Test on a real printer early: an emulator hides character-width issues. Verify: no cutoff on 58mm, change amount prominent, footer prints, auto-cut behaves.
5. For handheld/mobile: browsers on phones can't drive USB thermal printers — the mobile flow must offer "Save PDF" / share as the primary path, with a note in the UI.

# Security

- The receipt route and actions enforce `receipt:print` and sale-view scope server-side.
- Receipts contain store identity and sale data — fine for staff; no customer PII is added beyond what the sale has.
- Never embed user-supplied HTML in the receipt (titles/notes are plain text).

# Performance

- Receipt generation is a single query (sale + items + payments) — negligible cost.
- Print modal mounts lazily (only after checkout or on request).
- PDF fallback reuses the pdfmake factory; both paths share `buildReceiptData` so numbers can't diverge.

# Testing

- Unit: `buildReceiptData` snapshot correctness (totals, change, status variants VOIDED/REFUNDED), width settings mapping.
- E2E (Playwright): complete a sale → print modal shows preview → "Save PDF" downloads a valid PDF; reprint from sales history; VOIDED sale reprint shows the VOIDED marker. (Automating the physical print dialog is out of scope — assert the print node's content and CSS.)
- Visual: golden-file or manual review of the preview at 58mm and 80mm.
- See `bookstore-testing`.

# Common Mistakes

- Rendering receipts from live `books` data (reprints drift when prices change).
- Printing the whole page with `window.print()` (headers/footers, wasted paper).
- Images/logos on thermal receipts (slow, smeared).
- Proportional fonts on 58mm (misaligned totals).
- Forgetting the VOIDED/REFUNDED marker on reprints of altered sales.
- Hardcoding the store name — breaks when settings change.
- Only testing on screen, never on an actual thermal printer.
- Letting a cashier reprint another cashier's receipts (scope check missing).

# Examples

**Print trigger after checkout (POS):**

```tsx
const { data: receipt } = await buildReceiptData(saleId);   // server action
const print = useReactToPrint({ contentRef: printRef, onAfterPrint: () => setDone(true) });
<Modal open={showReceipt} ...>
  <ReceiptPreview data={receipt} />
  <Button onClick={() => print()}>Print</Button>
  <Button onClick={downloadPdf(receipt.sale.id)}>Save PDF</Button>
</Modal>
<ReceiptPrint ref={printRef} data={receipt} />  {/* off-screen printable node */}
```

/**
 * Pure pricing/totals logic — tested, reused by POS, sales, purchases, reports
 * (skills/bookstore-core conventions: integer cents, server re-validates).
 */

export interface PriceLine {
  unitPriceCents: number;
  quantity: number;
  discountCents?: number;
}

export function lineTotal(line: PriceLine): number {
  const gross = line.unitPriceCents * line.quantity;
  return Math.max(0, gross - (line.discountCents ?? 0));
}

export interface CartTotals {
  subtotalCents: number;
  discountCents: number;
  taxCents: number;
  totalCents: number;
}

/**
 * Compute cart totals. discountCents is the transaction-level discount;
 * taxRateBps is the tax rate in basis points (0 = off).
 */
export function cartTotals(
  lines: PriceLine[],
  discountCents = 0,
  taxRateBps = 0,
): CartTotals {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const safeDiscount = Math.min(Math.max(discountCents, 0), subtotalCents);
  const taxable = subtotalCents - safeDiscount;
  const taxCents = Math.round((taxable * taxRateBps) / 10000);
  return {
    subtotalCents,
    discountCents: safeDiscount,
    taxCents,
    totalCents: taxable + taxCents,
  };
}

export interface DiscountResult {
  discountCents: number;
  totalCents: number;
  error: string | null;
}

/**
 * Apply a percentage or fixed discount with a server-enforced cap
 * (maxDiscountPercent, e.g. 20 → 20%). Returns error instead of throwing.
 */
export function applyDiscount(
  subtotalCents: number,
  opts: { percent?: number; fixedCents?: number },
  maxDiscountPercent: number,
): DiscountResult {
  let requested: number;
  if (opts.percent !== undefined) {
    requested = Math.round((subtotalCents * opts.percent) / 100);
  } else if (opts.fixedCents !== undefined) {
    requested = opts.fixedCents;
  } else {
    requested = 0;
  }
  const cap = Math.round((subtotalCents * maxDiscountPercent) / 100);
  if (requested < 0 || requested > cap) {
    return { discountCents: 0, totalCents: subtotalCents, error: 'Discount exceeds the allowed limit.' };
  }
  const discountCents = Math.min(requested, subtotalCents);
  return { discountCents, totalCents: subtotalCents - discountCents, error: null };
}

/** Change due for cash payments; never negative. */
export function computeChange(totalCents: number, tenderedCents: number): number {
  return Math.max(0, tenderedCents - totalCents);
}

/** Purchase totals: subtotal (+ line discounts) − discount + shipping + tax. */
export function purchaseTotals(
  lines: PriceLine[],
  opts: { discountCents?: number; shippingCents?: number; taxCents?: number },
): { subtotalCents: number; discountCents: number; shippingCents: number; taxCents: number; totalCents: number } {
  const subtotalCents = lines.reduce((sum, l) => sum + lineTotal(l), 0);
  const discountCents = Math.min(Math.max(opts.discountCents ?? 0, 0), subtotalCents);
  const shippingCents = Math.max(opts.shippingCents ?? 0, 0);
  const taxCents = Math.max(opts.taxCents ?? 0, 0);
  return {
    subtotalCents,
    discountCents,
    shippingCents,
    taxCents,
    totalCents: subtotalCents - discountCents + shippingCents + taxCents,
  };
}

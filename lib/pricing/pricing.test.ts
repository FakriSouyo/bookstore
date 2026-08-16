import { describe, expect, it } from 'vitest';
import {
  applyDiscount,
  cartTotals,
  computeChange,
  lineTotal,
  purchaseTotals,
} from './pricing';

describe('lineTotal', () => {
  it('multiplies unit price by quantity', () => {
    expect(lineTotal({ unitPriceCents: 1000, quantity: 3 })).toBe(3000);
  });

  it('applies line discount but never below zero', () => {
    expect(lineTotal({ unitPriceCents: 1000, quantity: 2, discountCents: 500 })).toBe(1500);
    expect(lineTotal({ unitPriceCents: 1000, quantity: 1, discountCents: 5000 })).toBe(0);
  });
});

describe('cartTotals', () => {
  it('sums subtotal and total without tax/discount', () => {
    const t = cartTotals([
      { unitPriceCents: 2500, quantity: 2 },
      { unitPriceCents: 1000, quantity: 1 },
    ]);
    expect(t).toEqual({
      subtotalCents: 6000,
      discountCents: 0,
      taxCents: 0,
      totalCents: 6000,
    });
  });

  it('clamps transaction discount to subtotal', () => {
    const t = cartTotals([{ unitPriceCents: 5000, quantity: 1 }], 99999);
    expect(t.discountCents).toBe(5000);
    expect(t.totalCents).toBe(0);
  });

  it('computes tax in basis points on the discounted amount', () => {
    const t = cartTotals([{ unitPriceCents: 10000, quantity: 1 }], 1000, 1100); // 10% off, 11% tax
    expect(t.subtotalCents).toBe(10000);
    expect(t.discountCents).toBe(1000);
    expect(t.taxCents).toBe(990); // 9000 * 11%
    expect(t.totalCents).toBe(9990);
  });
});

describe('applyDiscount', () => {
  it('computes percentage discount', () => {
    const r = applyDiscount(10000, { percent: 10 }, 20);
    expect(r).toEqual({ discountCents: 1000, totalCents: 9000, error: null });
  });

  it('computes fixed discount within the cap', () => {
    const r = applyDiscount(10000, { fixedCents: 1500 }, 20);
    expect(r).toEqual({ discountCents: 1500, totalCents: 8500, error: null });
  });

  it('rejects discounts above the configured cap', () => {
    const r = applyDiscount(10000, { percent: 50 }, 20);
    expect(r.error).toBe('Discount exceeds the allowed limit.');
    expect(r.discountCents).toBe(0);
  });

  it('rejects negative discounts', () => {
    const r = applyDiscount(10000, { fixedCents: -100 }, 20);
    expect(r.error).not.toBeNull();
  });

  it('caps fixed discount at subtotal when cap exceeds it', () => {
    const r = applyDiscount(1000, { fixedCents: 1500 }, 200);
    expect(r).toEqual({ discountCents: 1000, totalCents: 0, error: null });
  });
});

describe('computeChange', () => {
  it('returns exact change', () => {
    expect(computeChange(5000, 10000)).toBe(5000);
  });

  it('never returns negative change', () => {
    expect(computeChange(10000, 5000)).toBe(0);
  });

  it('handles exact tender', () => {
    expect(computeChange(5000, 5000)).toBe(0);
  });
});

describe('purchaseTotals', () => {
  it('adds shipping and tax, subtracts discount', () => {
    const t = purchaseTotals(
      [
        { unitPriceCents: 1000, quantity: 5 },
        { unitPriceCents: 2000, quantity: 1 },
      ],
      { discountCents: 500, shippingCents: 1000, taxCents: 700 },
    );
    expect(t).toEqual({
      subtotalCents: 7000,
      discountCents: 500,
      shippingCents: 1000,
      taxCents: 700,
      totalCents: 8200,
    });
  });

  it('clamps discount to subtotal and negatives to zero', () => {
    const t = purchaseTotals([{ unitPriceCents: 1000, quantity: 1 }], {
      discountCents: 5000,
      shippingCents: -10,
      taxCents: -5,
    });
    expect(t.discountCents).toBe(1000);
    expect(t.shippingCents).toBe(0);
    expect(t.taxCents).toBe(0);
    expect(t.totalCents).toBe(0);
  });
});

import { describe, expect, it } from 'vitest';
import { currencySymbol, formatMoney, formatMoneyCompact } from './money';

describe('formatMoney', () => {
  it('formats cents as IDR without decimals by default', () => {
    expect(formatMoney(123456)).toBe('Rp\u00A01.235');
  });

  it('handles zero and negative', () => {
    expect(formatMoney(0)).toBe('Rp\u00A00');
    expect(formatMoney(-500)).toBe('-Rp\u00A05');
  });

  it('still formats other currencies with 2 decimals', () => {
    expect(formatMoney(123456, 'USD', 'en-US')).toBe('$1,234.56');
  });
});

describe('formatMoneyCompact', () => {
  it('uses full format for small amounts', () => {
    expect(formatMoneyCompact(99999)).toBe('Rp\u00A01.000');
  });

  it('compacts large amounts (ribu)', () => {
    const s = formatMoneyCompact(1_234_500);
    expect(s).toContain('Rp');
    expect(s).toContain('rb');
  });
});

describe('currencySymbol', () => {
  it('extracts the IDR symbol', () => {
    expect(currencySymbol('IDR')).toBe('Rp');
  });
});

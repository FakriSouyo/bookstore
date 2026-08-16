/**
 * Money helpers — all amounts in the app are stored as integer minor units
 * (cents) per bookstore-core conventions. Never use floats for money.
 * App default currency: IDR (Rupiah, locale id-ID, no decimals).
 */

export type Currency = string;

/** Format integer cents as a currency string, e.g. formatMoney(123456) → "Rp 1.235". */
export function formatMoney(cents: number, currency: Currency = 'IDR', locale = 'id-ID'): string {
  const fractionDigits = currency === 'IDR' ? 0 : 2;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(cents / 100);
}

/** Compact variant for KPI cards (large numbers), e.g. "Rp 1,2 jt". */
export function formatMoneyCompact(cents: number, currency: Currency = 'IDR', locale = 'id-ID'): string {
  if (Math.abs(cents) >= 100_000) {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(cents / 100);
  }
  return formatMoney(cents, currency, locale);
}

/** The currency symbol for a given currency/locale (for input prefixes). */
export function currencySymbol(currency: Currency = 'IDR', locale = 'id-ID'): string {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

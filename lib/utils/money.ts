/**
 * Money helpers — all amounts in the app are stored as integer minor units
 * (cents) per bookstore-core conventions. Never use floats for money.
 */

export type Currency = string;

/** Format integer cents as a currency string, e.g. formatMoney(123456) → "$1,234.56". */
export function formatMoney(cents: number, currency: Currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Compact variant for KPI cards (large numbers), e.g. "$12.3K". */
export function formatMoneyCompact(cents: number, currency: Currency = 'USD', locale = 'en-US'): string {
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
export function currencySymbol(currency: Currency = 'USD', locale = 'en-US'): string {
  const parts = new Intl.NumberFormat(locale, { style: 'currency', currency }).formatToParts(0);
  return parts.find((p) => p.type === 'currency')?.value ?? currency;
}

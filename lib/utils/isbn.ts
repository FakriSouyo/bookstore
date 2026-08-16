/** ISBN validation (skills/bookstore-books/SKILL.md). */

export function normalizeIsbn(raw: string): string {
  return raw.replace(/[\s-]/g, '');
}

export function isValidIsbn10(s: string): boolean {
  if (!/^\d{9}[\dX]$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += (s[i] === 'X' ? 10 : Number(s[i])) * (10 - i);
  }
  return sum % 11 === 0;
}

export function isValidIsbn13(s: string): boolean {
  if (!/^\d{13}$/.test(s)) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += Number(s[i]) * (i % 2 === 0 ? 1 : 3);
  }
  return sum % 10 === 0;
}

export function isValidIsbn(raw: string): boolean {
  const s = normalizeIsbn(raw);
  if (!s) return false;
  return /^97[89]/.test(s) ? isValidIsbn13(s) : isValidIsbn10(s) || isValidIsbn13(s);
}

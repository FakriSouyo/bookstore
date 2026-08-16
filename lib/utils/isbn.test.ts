import { describe, expect, it } from 'vitest';
import { isValidIsbn, isValidIsbn10, isValidIsbn13, normalizeIsbn } from './isbn';

describe('normalizeIsbn', () => {
  it('strips spaces and dashes', () => {
    expect(normalizeIsbn('978-0-306-40615-7')).toBe('9780306406157');
  });
});

describe('isValidIsbn10', () => {
  it('accepts a valid ISBN-10', () => {
    // 0-306-40615-2
    expect(isValidIsbn10('0306406152')).toBe(true);
  });

  it('accepts X check digit', () => {
    // 0-8044-2957-X
    expect(isValidIsbn10('080442957X')).toBe(true);
  });

  it('rejects invalid checksum', () => {
    expect(isValidIsbn10('0306406151')).toBe(false);
  });

  it('rejects wrong length', () => {
    expect(isValidIsbn10('12345')).toBe(false);
  });
});

describe('isValidIsbn13', () => {
  it('accepts a valid ISBN-13', () => {
    // 978-0-306-40615-7
    expect(isValidIsbn13('9780306406157')).toBe(true);
  });

  it('rejects invalid checksum', () => {
    expect(isValidIsbn13('9780306406158')).toBe(false);
  });
});

describe('isValidIsbn', () => {
  it('accepts valid ISBN-10 and ISBN-13 with formatting', () => {
    expect(isValidIsbn('0-306-40615-2')).toBe(true);
    expect(isValidIsbn('978-0-306-40615-7')).toBe(true);
  });

  it('rejects garbage', () => {
    expect(isValidIsbn('not-an-isbn')).toBe(false);
    expect(isValidIsbn('')).toBe(false);
  });
});

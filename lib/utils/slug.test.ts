import { describe, expect, it } from 'vitest';
import { slugify, uniqueSlug } from './slug';

describe('slugify', () => {
  it('lowercases and hyphenates', () => {
    expect(slugify('The Great Gatsby')).toBe('the-great-gatsby');
  });

  it('strips diacritics', () => {
    expect(slugify('Café au Lait')).toBe('cafe-au-lait');
  });

  it('collapses runs of separators', () => {
    expect(slugify('  Deep   Work  ')).toBe('deep-work');
  });

  it('falls back to a random slug for empty input', () => {
    expect(slugify('   ')).toMatch(/^item-/);
  });
});

describe('uniqueSlug', () => {
  it('appends a numeric suffix when taken', async () => {
    const taken = new Set(['clean-code']);
    const exists = async (s: string) => taken.has(s);
    const slug = await uniqueSlug('Clean Code', exists);
    expect(slug).toBe('clean-code-2');
    taken.add(slug);
    expect(await uniqueSlug('Clean Code', exists)).toBe('clean-code-3');
  });

  it('keeps the base slug when free', async () => {
    const slug = await uniqueSlug('Clean Code', async () => false);
    expect(slug).toBe('clean-code');
  });
});

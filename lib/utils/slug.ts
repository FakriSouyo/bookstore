/** Slug utilities (skills/bookstore-books/SKILL.md). */

export function slugify(text: string): string {
  const slug = text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return slug || `item-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Generate a unique slug by probing the caller's `exists` function
 * (e.g. supabase `.eq('slug', candidate)`). Pure and testable.
 */
export async function uniqueSlug(base: string, exists: (slug: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base);
  let candidate = root;
  let i = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${i++}`;
  }
  return candidate;
}

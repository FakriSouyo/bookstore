import { createSupabaseBrowserClient } from './browser';

export const BOOK_COVERS_BUCKET = 'book-covers';

/** Generate a safe, bucket-relative storage path. Never use user filenames. */
export function bookCoverPath(bookId: string, fileName: string): string {
  return `books/${bookId}/${fileName}`;
}

export async function uploadBookImage(bookId: string, file: File): Promise<{ path: string; url: string }> {
  const supabase = createSupabaseBrowserClient();
  const fileName = `${crypto.randomUUID()}.webp`;
  const path = bookCoverPath(bookId, fileName);
  const { error } = await supabase.storage.from(BOOK_COVERS_BUCKET).upload(path, file, {
    cacheControl: '3600',
    contentType: 'image/webp',
    upsert: false,
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(BOOK_COVERS_BUCKET).getPublicUrl(path);
  return { path, url: data.publicUrl };
}

export async function deleteBookImageObject(path: string): Promise<void> {
  const supabase = createSupabaseBrowserClient();
  const { error } = await supabase.storage.from(BOOK_COVERS_BUCKET).remove([path]);
  if (error) throw new Error(error.message);
}

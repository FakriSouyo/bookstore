/**
 * Books service (skills/bookstore-books + bookstore-image-upload).
 * Server-side validation + authz; stock is display-only here.
 */

import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { logAudit } from '@/lib/audit/log';
import { currentRole, requireRole } from '@/lib/auth/guards';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { AppError, mapDbError, mapRpcError } from '@/lib/utils/errors';
import { isValidIsbn, normalizeIsbn } from '@/lib/utils/isbn';
import { uniqueSlug } from '@/lib/utils/slug';
import type { BookRow, BookStatus } from '@/types/database';

export const bookInputSchema = z.object({
  title: z.string().trim().min(1, 'Title is required').max(300),
  author: z.string().trim().max(200).default(''),
  isbn: z
    .string()
    .trim()
    .optional()
    .nullable()
    .transform((v) => (v ? normalizeIsbn(v) : null))
    .refine((v) => v === null || isValidIsbn(v), { message: 'Invalid ISBN' }),
  barcode: z.string().trim().optional().nullable(),
  description: z.string().optional().nullable(),
  category_id: z.string().uuid().optional().nullable(),
  publisher_id: z.string().uuid().optional().nullable(),
  publication_year: z.number().int().min(1000).max(2100).optional().nullable(),
  edition: z.string().optional().nullable(),
  language: z.string().default('English'),
  purchase_price_cents: z.number().int().min(0).default(0),
  selling_price_cents: z.number().int().min(0).default(0),
  minimum_stock: z.number().int().min(0).default(0),
  location: z.string().optional().nullable(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'ARCHIVED']).default('ACTIVE'),
});

export type BookInput = z.infer<typeof bookInputSchema>;

export interface BookListParams {
  page: number;
  pageSize: number;
  search?: string;
  categoryId?: string;
  publisherId?: string;
  status?: BookStatus;
}

export interface BookListItem {
  id: string;
  title: string;
  isbn: string | null;
  barcode: string | null;
  author: string;
  category_name?: string | null;
  publisher_name?: string | null;
  selling_price_cents: number;
  purchase_price_cents?: number;
  stock: number;
  minimum_stock: number;
  status: BookStatus;
  coverUrl?: string | null;
}

export async function listBooks(params: BookListParams): Promise<{ rows: BookListItem[]; total: number }> {
  const role = await currentRole();
  const includeCosts = role === 'OWNER' || role === 'ADMIN';
  const supabase = await createSupabaseServerClient();

  const baseSelect = 'id,title,isbn,barcode,author,category_id,publisher_id,selling_price_cents,stock,minimum_stock,status,categories(name),publishers(name)';
  const select = includeCosts
    ? `${baseSelect},purchase_price_cents`
    : baseSelect;

  let query = supabase.from('books').select(select, { count: 'exact' });
  if (params.search) {
    query = query.or(
      `title.ilike.%${params.search}%,author.ilike.%${params.search}%,isbn.ilike.%${params.search}%,barcode.ilike.%${params.search}%`,
    );
  }
  if (params.categoryId) query = query.eq('category_id', params.categoryId);
  if (params.publisherId) query = query.eq('publisher_id', params.publisherId);
  if (params.status) query = query.eq('status', params.status);

  const from = (params.page - 1) * params.pageSize;
  query = query.order('title', { ascending: true }).range(from, from + params.pageSize - 1);

  const { data, count, error } = await query;
  if (error) throw mapDbError(error);

  const books = (data ?? []) as unknown as Array<
    BookRow & { categories?: { name: string } | null; publishers?: { name: string } | null }
  >;

  // primary covers in one query (no N+1)
  const ids = books.map((b) => b.id);
  const covers = new Map<string, string>();
  if (ids.length > 0) {
    const { data: imgs } = await supabase
      .from('book_images')
      .select('book_id,url')
      .in('book_id', ids)
      .eq('is_primary', true);
    (imgs ?? []).forEach((img) => covers.set(img.book_id, img.url));
  }

  const rows: BookListItem[] = books.map((b) => ({
    id: b.id,
    title: b.title,
    isbn: b.isbn,
    barcode: b.barcode,
    author: b.author,
    category_name: b.categories?.name ?? null,
    publisher_name: b.publishers?.name ?? null,
    selling_price_cents: b.selling_price_cents,
    ...(includeCosts ? { purchase_price_cents: b.purchase_price_cents } : {}),
    stock: b.stock,
    minimum_stock: b.minimum_stock,
    status: b.status,
    coverUrl: covers.get(b.id) ?? null,
  }));

  return { rows, total: count ?? 0 };
}

export async function getBook(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from('books')
    .select('*,categories(name),publishers(name)')
    .eq('id', id)
    .single();
  if (error || !data) throw new AppError('NOT_FOUND', 'Book not found.');

  const { data: images } = await supabase
    .from('book_images')
    .select('*')
    .eq('book_id', id)
    .order('is_primary', { ascending: false })
    .order('sort_order', { ascending: true });

  return { book: data, images: images ?? [] };
}

export async function createBook(input: BookInput): Promise<{ id: string }> {
  await requireRole('books:create');
  const parsed = bookInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const slug = await uniqueSlug(parsed.title, async (s) => {
    const { data } = await supabase.from('books').select('id').eq('slug', s).maybeSingle();
    return !!data;
  });
  const { data, error } = await supabase
    .from('books')
    .insert({ ...parsed, slug, stock: 0 })
    .select('id')
    .single();
  if (error) throw mapDbError(error);
  await logAudit('books.create', { type: 'book', id: data.id }, { title: parsed.title });
  revalidatePath('/books');
  return { id: data.id };
}

export async function updateBook(id: string, input: BookInput): Promise<void> {
  await requireRole('books:update');
  const parsed = bookInputSchema.parse(input);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('books').update({ ...parsed }).eq('id', id);
  if (error) throw mapDbError(error);
  await logAudit('books.update', { type: 'book', id }, { title: parsed.title });
  revalidatePath('/books');
  revalidatePath(`/books/${id}`);
}

export async function setBookStatus(id: string, status: BookStatus): Promise<void> {
  const isArchive = status === 'ARCHIVED';
  await requireRole(isArchive ? 'books:delete' : 'books:update');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from('books').update({ status }).eq('id', id);
  if (error) throw mapDbError(error);
  await logAudit(isArchive ? 'books.archive' : 'books.restore', { type: 'book', id }, { status });
  revalidatePath('/books');
}

// ---- images (bookstore-image-upload) ----

export async function attachBookImage(bookId: string, storagePath: string, url: string): Promise<void> {
  await requireRole('books:update');
  const supabase = await createSupabaseServerClient();
  const { count } = await supabase
    .from('book_images')
    .select('id', { count: 'exact', head: true })
    .eq('book_id', bookId);
  const { error } = await supabase.from('book_images').insert({
    book_id: bookId,
    storage_path: storagePath,
    url,
    is_primary: (count ?? 0) === 0,
    sort_order: count ?? 0,
  });
  if (error) throw mapDbError(error);
  await logAudit('books.image_upload', { type: 'book', id: bookId }, { storage_path: storagePath });
  revalidatePath(`/books/${bookId}`);
}

export async function setPrimaryImage(bookId: string, imageId: string): Promise<void> {
  await requireRole('books:update');
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc('set_primary_book_image', {
    p_book_id: bookId,
    p_image_id: imageId,
  });
  if (error) throw mapRpcError(error);
  await logAudit('books.image_primary', { type: 'book', id: bookId }, { image_id: imageId });
  revalidatePath(`/books/${bookId}`);
}

export async function deleteBookImage(imageId: string): Promise<void> {
  await requireRole('books:update');
  const supabase = await createSupabaseServerClient();
  const { data: image, error: fetchError } = await supabase
    .from('book_images')
    .select('*')
    .eq('id', imageId)
    .single();
  if (fetchError || !image) throw new AppError('NOT_FOUND', 'Image not found.');

  const admin = createSupabaseAdminClient();
  await admin.storage.from('book-covers').remove([image.storage_path]);

  const { error } = await supabase.from('book_images').delete().eq('id', imageId);
  if (error) throw mapDbError(error);

  if (image.is_primary) {
    const { data: nextImage } = await supabase
      .from('book_images')
      .select('id')
      .eq('book_id', image.book_id)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle();
    if (nextImage) {
      await supabase.from('book_images').update({ is_primary: true }).eq('id', nextImage.id);
    }
  }
  await logAudit('books.image_delete', { type: 'book', id: image.book_id }, { image_id: imageId });
  revalidatePath(`/books/${image.book_id}`);
}

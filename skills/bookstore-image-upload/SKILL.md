---
name: bookstore-image-upload
description: Book image pipeline for the Bookstore Management & POS app — client validation and compression, safe storage paths in the Supabase book-covers bucket, upload/preview/replace/delete, primary image selection, drag & drop and mobile capture, and orphan cleanup rules.
---

# Purpose

Define the complete pipeline for book cover images: selecting a file, validating and compressing it, uploading to Supabase Storage, recording metadata, associating images with a book, choosing the primary cover, and deleting/replacing safely. Images never live in PostgreSQL — only in the `book-covers` Storage bucket, with metadata rows in `book_images`.

# Scope

- Storage layout and bucket policies (policy statements in `bookstore-security`).
- Client-side validation (type, size, MIME) and compression.
- Safe filename/path generation.
- Upload / preview / replace / delete / primary selection / reorder.
- Drag & drop and mobile camera/file capture.
- Orphan cleanup and deletion semantics when a book is archived/deleted.

Out of scope: `book_images` table definition (see `bookstore-database`), RLS policy SQL (see `bookstore-security`), generic storage client helpers (see `bookstore-supabase`).

# When to Use

Any task involving book covers: the Images tab of the book form, the book detail gallery, adding/replacing/deleting an image, or changing the primary cover. Always pair with `bookstore-books` (the owning module) and `bookstore-supabase` (client usage).

# Architecture

## Storage layout

Bucket: `book-covers`. Paths are generated, never user filenames:

```
book-covers/
  books/{book_id}/
    {uuid}.webp          # primary or any image — role decided by metadata, not filename
    {uuid}.webp
```

- Filenames: `crypto.randomUUID()` + `.webp` (or `.jpg`/`.png` only when compression is unavailable/disabled — see below). Never trust or reuse the original filename.
- The `storage_path` column stores the bucket-relative path; display URLs are derived (`getPublicUrl`).

## Pipeline (single component + service)

The whole flow is owned by `components/upload/BookImageManager.tsx` (used in the book form Images tab and editable on the detail page):

1. **Select** — AntD `Upload.Dragger` (drag & drop desktop; tap to pick / camera on mobile via `accept` + `capture` attribute). Multiple files allowed; images only.
2. **Validate (client)** — type must be `image/jpeg`, `image/png`, or `image/webp`; each file ≤ 5 MB pre-compression.
3. **Compress** — client-side, before upload: resize longest edge to 1600px max, encode WebP at quality ~0.8 (canvas-based; fall back to original if WebP encoding fails). Target post-compression size ≤ 2 MB. (Optionally use a small helper in `lib/utils/image.ts`.)
4. **Upload** — through the storage wrapper (`bookstore-supabase`) to `books/{book_id}/{uuid}.webp`; `upsert: false`.
5. **Record** — insert `book_images` row `{ book_id, storage_path, url, is_primary, sort_order }`. First image on a book becomes primary automatically.
6. **Associate/preview** — gallery shows uploaded images with badges: PRIMARY (first slot), sort order, actions per image.
7. **Replace** — upload the new file, then delete the old object + row (audited).
8. **Delete** — confirm (`Popconfirm`/`Modal.confirm`); remove storage object, then delete metadata row. If the deleted image was primary, promote the next image (lowest `sort_order`) to primary.
9. **Set primary** — `is_primary` swap (unique partial index in `bookstore-database` enforces one primary; use a small RPC or a transaction in the service to swap atomically).

## Permissions

- Upload/delete/replace/primary changes require `books:update` (ADMIN/OWNER). Cashiers cannot mutate images.
- The UI gates via `usePermission('books:update')`; the server action enforces `requireRole('books:update')`.
- Storage bucket policies (see `bookstore-security`) allow only authenticated users with `books:update` to insert/update/delete objects; reads are allowed for any authenticated user (covers appear in POS and lists).

## Deletion semantics

- **Archiving a book does not delete its images by default.** The book may be restored; deleting images is a separate explicit action (with confirmation), because archive is reversible.
- **Hard-deleting a book** (only allowed when it has no history — see `bookstore-books`): delete its storage objects and `book_images` rows. Implement as a service transaction: list paths → remove objects → delete rows; retry object removal failures, and never leave `book_images` rows pointing at deleted objects.
- **Orphan cleanup**: on any upload failure, remove the partial object immediately. Periodic sweep (optional, OWNER-triggered admin action) lists `book_images` paths and verifies object existence; conversely, objects without a metadata row can be listed and purged. Document the sweep; do not run it automatically in normal operations.

# Rules

1. Images are stored in `book-covers` only; never in Postgres (`bytea` is forbidden), never in the app filesystem.
2. Paths and filenames are generated server-approved (uuid + safe extension); original filenames are never used.
3. MIME validation happens client-side (UX) **and** server-side (authorization): a server action re-checks the upload result type/size before recording metadata.
4. Compression is client-side; server rejects oversize objects (storage policy or post-upload check) rather than trusting the client.
5. One primary image per book, enforced by the database (partial unique index).
6. Deletion removes the object and the row together (object-first, then row; on failure, report and retry — never leave dangling metadata).
7. Only `books:update` roles upload/delete; RLS/storage policies enforce this independently of the UI.

# Implementation Guidance

```tsx
// components/upload/BookImageManager.tsx (abridged)
<Upload.Dragger
  accept="image/jpeg,image/png,image/webp"
  multiple
  beforeUpload={(file) => validateAndEnqueue(file)}   // validate → compress → add to queue
  customRequest={({ file, onSuccess, onError }) => uploadCover(bookId, file).then(onSuccess).catch(onError)}
  showUploadList={false}
  disabled={!canEdit}
>
  <p>Drag & drop covers here, or click to browse / capture</p>
</Upload.Dragger>
<Image.PreviewGroup>
  {images.map(img => (
    <CoverCard key={img.id} img={img}
      isPrimary={img.is_primary}
      onSetPrimary={canEdit ? () => setPrimary(img.id) : undefined}
      onReplace={canEdit ? (f) => replace(img, f) : undefined}
      onDelete={canEdit ? () => confirmDelete(img) : undefined} />
  ))}
</Image.PreviewGroup>
```

Server action sketch (`lib/services/books.ts` → `setPrimaryImage`, `deleteImage`, `replaceImage`):

```ts
export async function setPrimaryImage(bookId: string, imageId: string) {
  await requireRole('books:update');
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.rpc('set_primary_book_image', { p_book_id: bookId, p_image_id: imageId });
  if (error) throw mapRpcError(error);
  await logAudit('books.image_primary', bookId, { imageId });
}
```

(The `set_primary_book_image` RPC is a small `security definer` function in `bookstore-database` that clears the old primary and sets the new one in one transaction.)

# Security

- Storage policies (see `bookstore-security`): `SELECT` any authenticated user; `INSERT/UPDATE/DELETE` only for `OWNER`/`ADMIN` (checked against `profiles`). Never make the bucket public-writable.
- Never trust the client's claimed MIME: check the uploaded object's `contentType` server-side; validate size.
- Signed URLs are not required for an internal app (bucket can be public-read), but if covers must stay private, switch display to signed URLs with short expiry — never expose service-role signing.
- Audit every upload, replace, primary change, and delete (`books.image_upload`, `books.image_delete`, …).

# Performance

- Compress before upload: reduces storage and bandwidth, and thumbnails load fast.
- `next/image` with explicit `sizes` for covers; the CDN URL pattern (`/storage/v1/object/public/...`) is cacheable.
- Fetch images for a list page in one query (all `book_id`s), not N+1.

# Testing

- Unit: path generation (uuid, safe extension, no user input in path), validation rules (type/size), primary-promotion logic when the primary is deleted (pure part).
- Integration: upload → object exists + metadata row; replace removes the old object; delete removes object + row; primary swap respects the unique index; unauthorized role gets `AUTHZ_DENIED` from the RPC.
- E2E: upload two images, set the second as primary, refresh → order/primary persisted; delete primary → next promoted.
- See `bookstore-testing`.

# Common Mistakes

- Storing images in Postgres or on the app server filesystem.
- Using the original filename or user-controlled path segments (path traversal / collision).
- Client-only validation (a malicious client uploads an exe or a 200 MB file).
- Leaving the bucket publicly writable ("it's just covers").
- Deleting the metadata row but not the object (orphan files accumulating in storage).
- Deleting images when archiving a book (breaks restore).
- Not enforcing one primary image in the database.
- Uploading un-compressed phone photos (multi-MB) and slowing the list page.

# Examples

**Compression helper (client):**

```ts
export async function compressToWebp(file: File): Promise<File> {
  const img = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(img.width, img.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(img.width * scale);
  canvas.height = Math.round(img.height * scale);
  canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), 'image/webp', 0.8));
  return new File([blob], `${crypto.randomUUID()}.webp`, { type: 'image/webp' });
}
```

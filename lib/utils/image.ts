/**
 * Client-side image compression (skills/bookstore-image-upload/SKILL.md).
 * Resize longest edge to 1600px, encode WebP @ 0.8. Falls back to the
 * original file when encoding fails.
 */

export async function compressToWebp(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('no canvas context');
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.8));
    if (!blob) throw new Error('webp encode failed');
    bitmap.close();
    return new File([blob], `${crypto.randomUUID()}.webp`, { type: 'image/webp' });
  } catch {
    return file;
  }
}

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function validateImageFile(file: File): string | null {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
    return 'Only JPG, PNG, or WEBP images are allowed.';
  }
  if (file.size > 5 * 1024 * 1024) {
    return 'Image must be 5 MB or smaller.';
  }
  return null;
}

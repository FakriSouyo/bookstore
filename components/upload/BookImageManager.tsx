'use client';

import { ImageUp, Star, Trash2, UploadCloud } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';import { toast } from 'sonner';

import { attachBookImageAction, deleteBookImageAction, setPrimaryImageAction } from '@/app/(app)/books/actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { compressToWebp, validateImageFile } from '@/lib/utils/image';
import { uploadBookImage } from '@/lib/supabase/storage';

interface BookImage {
  id: string;
  url: string;
  is_primary: boolean;
  sort_order: number;
}

export function BookImageManager({ bookId, images, canEdit }: { bookId: string; images: BookImage[]; canEdit: boolean }) {
  const router = useRouter();
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const validationError = validateImageFile(file);
    if (validationError) {
      toast.error(validationError);
      return;
    }
    setUploading(true);
    try {
      const compressed = await compressToWebp(file);
      const { path, url } = await uploadBookImage(bookId, compressed);
      await attachBookImageAction(bookId, path, url);
      toast.success('Gambar terunggah');
      router.refresh();
    } catch {
      toast.error('Upload gagal. Silakan coba lagi.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const setPrimary = async (imageId: string) => {
    try {
      await setPrimaryImageAction(bookId, imageId);
      toast.success('Sampul utama diperbarui');
      router.refresh();
    } catch {
      toast.error('Gagal memperbarui sampul utama.');
    }
  };

  const remove = async (imageId: string) => {
    try {
      await deleteBookImageAction(imageId);
      toast.success('Gambar dihapus');
      router.refresh();
    } catch {
      toast.error('Gagal menghapus gambar.');
    }
  };

  return (
    <div>
      {canEdit && (
        <div
          className="mb-4 flex cursor-pointer flex-col items-center justify-center gap-1.5 border border-dashed border-border bg-muted/40 px-4 py-6 text-center transition-colors hover:border-primary/60"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            void handleFiles(e.dataTransfer.files);
          }}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          <UploadCloud className="size-5 text-muted-foreground" />
          <p className="m-0 text-[13px] text-muted-foreground">
            {uploading ? 'Mengunggah…' : 'Tarik & letakkan sampul di sini, atau klik untuk memilih / memotret'}
          </p>
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            className="hidden"
            onChange={(e) => void handleFiles(e.target.files)}
            disabled={uploading}
          />
        </div>
      )}
      {images.length === 0 ? (
        <p className="m-0 text-[13px] text-muted-foreground">Belum ada gambar. Unggahan pertama menjadi sampul utama.</p>
      ) : (
        <div className="flex flex-wrap gap-3">
          {images.map((img) => (
            <div key={img.id} className="w-[120px]">
              <div className={cn('relative', img.is_primary && 'ring-2 ring-amber-500')}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="sampul" width={120} height={160} decoding="async" className="h-[160px] w-[120px] object-cover" />
                <div className="absolute top-1 right-1">
                  {img.is_primary ? (
                    <span className="flex size-6 items-center justify-center bg-amber-500/90 text-amber-50">
                      <Star className="size-3.5 fill-current" />
                    </span>
                  ) : canEdit ? (
                    <Button
                      variant="outline"
                      size="icon-sm"
                      className="size-6 border-background/60 bg-background/80"
                      onClick={() => setPrimary(img.id)}
                      title="Jadikan sampul utama"
                    >
                      <Star className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
              {canEdit && (
                <div className="mt-1 text-center">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-6 text-xs text-destructive hover:text-destructive">
                        <Trash2 className="size-3.5" />
                        Hapus
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus gambar ini?</AlertDialogTitle>
                        <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Batal</AlertDialogCancel>
                        <AlertDialogAction onClick={() => void remove(img.id)}>Hapus</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              )}
              {img.is_primary && <p className="m-0 mt-0.5 text-center text-[11px] text-amber-600">Sampul utama</p>}
            </div>
          ))}
          {canEdit && images.length > 0 && (
            <button
              type="button"
              className="flex size-[120px] flex-col items-center justify-center gap-1 border border-dashed border-border text-muted-foreground transition-colors hover:border-primary/60 hover:text-primary"
              onClick={() => inputRef.current?.click()}
            >
              <ImageUp className="size-5" />
              <span className="text-xs">Tambah</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

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
import { setBookStatusAction } from '@/app/(app)/books/actions';
import { safeMessage } from '@/lib/utils/errors';
import type { BookStatus } from '@/types/database';

export function BookRowActions({ bookId, status, canEdit, canDelete }: { bookId: string; status: BookStatus; canEdit: boolean; canDelete: boolean }) {
  const router = useRouter();

  const archive = async () => {
    try {
      await setBookStatusAction(bookId, 'ARCHIVED');
      toast.success('Buku diarsipkan');
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    }
  };

  return (
    <div className="flex items-center gap-1">
      <Button variant="link" size="sm" className="h-7 px-1.5" asChild>
        <a href={`/books/${bookId}`}>Lihat</a>
      </Button>
      {canEdit && (
        <Button variant="link" size="sm" className="h-7 px-1.5" asChild>
          <a href={`/books/${bookId}?tab=edit`}>Ubah</a>
        </Button>
      )}
      {canDelete && status !== 'ARCHIVED' && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="link" size="sm" className="h-7 px-1.5 text-destructive hover:text-destructive">
              Arsipkan
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Arsipkan buku ini?</AlertDialogTitle>
              <AlertDialogDescription>Buku akan disembunyikan dari POS, tetapi riwayatnya tetap utuh.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => void archive()}>Arsipkan</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

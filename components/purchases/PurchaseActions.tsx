'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { receivePurchaseAction, updatePurchaseStatusAction } from '@/app/(app)/purchases/actions';
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
import { safeMessage } from '@/lib/utils/errors';
import type { PurchaseStatus } from '@/types/database';

export function PurchaseActions({ id, status, canReceive }: { id: string; status: PurchaseStatus; canReceive: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const run = async (fn: () => Promise<unknown>, okMsg: string) => {
    setBusy(true);
    try {
      await fn();
      toast.success(okMsg);
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'DRAFT' && (
        <Button disabled={busy} onClick={() => run(() => updatePurchaseStatusAction(id, 'ORDERED'), 'Pesanan dibuat')}>
          Buat pesanan
        </Button>
      )}
      {(status === 'DRAFT' || status === 'ORDERED') && (
        <Button disabled={busy || !canReceive} onClick={() => run(() => receivePurchaseAction(id), 'Stok diterima — inventori diperbarui')}>
          Terima stok
        </Button>
      )}
      {status === 'RECEIVED' && (
        <Button disabled={busy} onClick={() => run(() => updatePurchaseStatusAction(id, 'COMPLETED'), 'Pembelian selesai')}>
          Selesaikan pembelian
        </Button>
      )}
      {(status === 'DRAFT' || status === 'ORDERED') && (
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={busy}>
              Batalkan pembelian
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Batalkan pembelian ini?</AlertDialogTitle>
              <AlertDialogDescription>Stok tidak akan terpengaruh.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Batal</AlertDialogCancel>
              <AlertDialogAction onClick={() => run(() => updatePurchaseStatusAction(id, 'CANCELLED', { notes: 'Dibatalkan oleh pengguna' }), 'Pembelian dibatalkan')}>
                Batalkan
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
}

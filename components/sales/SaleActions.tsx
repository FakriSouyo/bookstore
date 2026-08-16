'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { refundSaleAction, voidSaleAction } from '@/app/(app)/sales/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { safeMessage } from '@/lib/utils/errors';
import type { SaleStatus } from '@/types/database';

interface SaleItem {
  book_id: string;
  title_snapshot: string;
  quantity: number;
}

export function SaleActions({
  saleId,
  status,
  items,
  canVoid,
  canRefund,
}: {
  saleId: string;
  status: SaleStatus;
  items: SaleItem[];
  canVoid: boolean;
  canRefund: boolean;
}) {
  const router = useRouter();
  const [voidOpen, setVoidOpen] = useState(false);
  const [refundOpen, setRefundOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [amount, setAmount] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(items.map((i) => [i.book_id, i.quantity])),
  );
  const [busy, setBusy] = useState(false);

  const doVoid = async () => {
    if (!reason.trim()) {
      toast.error('Alasan wajib diisi untuk membatalkan penjualan.');
      return;
    }
    setBusy(true);
    try {
      await voidSaleAction(saleId, reason);
      toast.success('Penjualan dibatalkan — stok kembali ke inventori');
      setVoidOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    } finally {
      setBusy(false);
    }
  };

  const doRefund = async () => {
    setBusy(true);
    try {
      const returned = items
        .map((i) => ({ book_id: i.book_id, quantity: quantities[i.book_id] ?? 0 }))
        .filter((i) => i.quantity > 0);
      await refundSaleAction({ sale_id: saleId, items: returned, amount_cents: Math.round(Number(amount) || 0) * 100, reason });
      toast.success('Refund dicatat — stok kembali');
      setRefundOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (status !== 'COMPLETED') return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {canVoid && (
          <Button variant="destructive" onClick={() => setVoidOpen(true)}>
            Batalkan penjualan
          </Button>
        )}
        {canRefund && (
          <Button variant="outline" onClick={() => setRefundOpen(true)}>
            Refund
          </Button>
        )}
      </div>

      <Dialog open={voidOpen} onOpenChange={setVoidOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Batalkan penjualan ini?</DialogTitle>
          </DialogHeader>
          <p className="m-0 text-[13px] text-muted-foreground">
            Seluruh {items.length} item akan dikembalikan ke inventori. Tindakan ini tidak dapat dibatalkan.
          </p>
          <Textarea rows={3} placeholder="Alasan (wajib)" value={reason} onChange={(e) => setReason(e.target.value)} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>
              Batal
            </Button>
            <Button variant="destructive" disabled={busy} onClick={() => void doVoid()}>
              {busy ? 'Memproses…' : 'Batalkan penjualan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={refundOpen} onOpenChange={setRefundOpen}>
        <DialogContent className="max-h-[85vh] max-w-[480px] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Refund</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            {items.map((item) => (
              <div key={item.book_id} className="flex items-center justify-between gap-2">
                <span className="min-w-0 flex-1 truncate text-[13px]">{item.title_snapshot}</span>
                <Input
                  type="number"
                  min={0}
                  max={item.quantity}
                  className="w-20"
                  value={quantities[item.book_id]}
                  onChange={(e) => setQuantities((prev) => ({ ...prev, [item.book_id]: Math.min(item.quantity, Number(e.target.value) || 0) }))}
                />
              </div>
            ))}
            <div className="flex flex-col gap-1.5">
              <Label>Jumlah refund (Rp)</Label>
              <Input type="number" min={0} placeholder="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Alasan (wajib)</Label>
              <Textarea rows={2} placeholder="Alasan" value={reason} onChange={(e) => setReason(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOpen(false)}>
              Batal
            </Button>
            <Button disabled={busy} onClick={() => void doRefund()}>
              {busy ? 'Memproses…' : 'Catat refund'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

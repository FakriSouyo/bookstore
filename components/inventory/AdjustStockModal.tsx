'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { adjustStockAction } from '@/app/(app)/inventory/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { safeMessage } from '@/lib/utils/errors';
import type { MovementType } from '@/types/database';

const TYPES: Array<{ value: MovementType; label: string; direction: 'IN' | 'OUT' }> = [
  { value: 'ADJUSTMENT_IN', label: 'Penyesuaian masuk (stok ternyata lebih)', direction: 'IN' },
  { value: 'ADJUSTMENT_OUT', label: 'Penyesuaian keluar (stok ternyata kurang)', direction: 'OUT' },
  { value: 'DAMAGE', label: 'Rusak (penghapusan)', direction: 'OUT' },
  { value: 'LOSS', label: 'Hilang', direction: 'OUT' },
  { value: 'CORRECTION', label: 'Koreksi kesalahan sebelumnya', direction: 'IN' },
];

interface BookOption {
  id: string;
  title: string;
  stock: number;
}

type Mode = 'target' | 'delta';

export function AdjustStockModal({
  open,
  onClose,
  books,
  defaultBookId,
}: {
  open: boolean;
  onClose: () => void;
  books: BookOption[];
  /** Preselect a specific book (e.g. from the book detail page). */
  defaultBookId?: string;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [bookId, setBookId] = useState(defaultBookId ?? '');
  const [type, setType] = useState<MovementType | ''>('');
  const [mode, setMode] = useState<Mode>('target');
  const [quantity, setQuantity] = useState('1');
  const [target, setTarget] = useState('');
  const [notes, setNotes] = useState('');

  const selectedBook = books.find((b) => b.id === bookId);
  const direction = TYPES.find((t) => t.value === type)?.direction;

  // Signed change to apply. Target mode: computed from the requested final
  // stock. Delta mode: from the user-typed quantity + chosen reason direction.
  let delta = 0;
  if (mode === 'target' && selectedBook) {
    const t = Number(target);
    if (Number.isFinite(t) && t >= 0) delta = Math.round(t) - selectedBook.stock;
  } else {
    delta = direction === 'IN' ? Number(quantity) || 0 : -(Number(quantity) || 0);
  }
  const previewStock = Math.max(0, (selectedBook?.stock ?? 0) + delta);

  const onSave = async () => {
    if (!bookId) {
      toast.error('Pilih buku');
      return;
    }
    if (mode === 'delta') {
      if (!type) {
        toast.error('Pilih alasan');
        return;
      }
      if (!Number(quantity) || Number(quantity) <= 0) {
        toast.error('Jumlah harus lebih dari 0');
        return;
      }
    } else {
      const t = Number(target);
      if (!Number.isFinite(t) || t < 0) {
        toast.error('Target stok harus angka 0 atau lebih');
        return;
      }
    }
    if (!notes.trim()) {
      toast.error('Catatan wajib untuk penyesuaian');
      return;
    }
    if (delta === 0) {
      toast.error('Stok tidak berubah — ubah angkanya dulu');
      return;
    }

    // Map the signed delta onto the RPC: it takes a positive quantity plus a
    // movement type whose name implies the direction.
    const movementType = mode === 'target'
      ? (delta > 0 ? 'ADJUSTMENT_IN' : 'ADJUSTMENT_OUT')
      : type;
    const qty = Math.abs(delta);

    setSaving(true);
    try {
      await adjustStockAction({
        book_id: bookId,
        movement_type: movementType as 'ADJUSTMENT_IN' | 'ADJUSTMENT_OUT' | 'DAMAGE' | 'LOSS' | 'CORRECTION',
        quantity: qty,
        notes,
      });
      toast.success(`Stok diubah: ${selectedBook?.stock ?? '?'} → ${previewStock}`);
      setBookId('');
      setType('');
      setQuantity('1');
      setTarget('');
      setNotes('');
      setMode('target');
      onClose();
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Ubah stok</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Buku</Label>
            {books.length === 1 && defaultBookId ? (
              <div className="rounded-none border border-border bg-muted/40 px-3 py-2 text-[13px]">
                {books[0].title} — stok {books[0].stock}
              </div>
            ) : (
              <Select value={bookId} onValueChange={setBookId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Cari berdasarkan judul" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title} — stok {b.stock}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Mode picker: set a target number, or adjust by a delta. */}
          <div className="flex gap-1 rounded-none border border-border bg-muted/40 p-0.5">
            {(
              [
                ['target', 'Set stok ke'],
                ['delta', 'Tambah / kurangi'],
              ] as Array<[Mode, string]>
            ).map(([m, label]) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={cn(
                  'flex-1 rounded-none px-2 py-1.5 text-[13px] font-medium transition-colors',
                  mode === m ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {mode === 'target' ? (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="adj-target">
                Stok akhir (target){selectedBook ? ` — saat ini ${selectedBook.stock}` : ''}
              </Label>
              <Input
                id="adj-target"
                type="number"
                min={0}
                placeholder="cth. 10"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
              />
              <p className="m-0 text-xs text-muted-foreground">
                Delta dihitung otomatis dari stok saat ini. Alasan &amp; catatan tetap dicatat untuk audit.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="adj-qty">Jumlah perubahan (selalu positif)</Label>
                <Input id="adj-qty" type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Alasan</Label>
                <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Mengapa stok berubah?" />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="adj-notes">Catatan</Label>
            <Textarea id="adj-notes" rows={2} placeholder="cth. Stok fisik dihitung ulang saat stok opname" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
          {selectedBook ? (
            <div className="border border-info/30 bg-info/5 px-3 py-2 text-[13px] text-info">
              {selectedBook.title}: stok saat ini {selectedBook.stock} → {previewStock} ({delta > 0 ? '+' : ''}
              {delta})
            </div>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Batal
          </Button>
          <Button disabled={saving} onClick={() => void onSave()}>
            {saving ? 'Menyimpan…' : 'Simpan'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

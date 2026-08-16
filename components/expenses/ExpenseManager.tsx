'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createExpenseAction, deleteExpenseAction, updateExpenseAction } from '@/app/(app)/expenses/actions';
import { EmptyState } from '@/components/shared/EmptyState';
import { Money } from '@/components/shared/Money';
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { safeMessage } from '@/lib/utils/errors';
import type { ExpenseCategory, ExpenseRow } from '@/types/database';

const CATEGORIES: Array<{ label: string; value: ExpenseCategory }> = [
  { label: 'Sewa', value: 'RENT' },
  { label: 'Listrik', value: 'ELECTRICITY' },
  { label: 'Internet', value: 'INTERNET' },
  { label: 'Gaji', value: 'SALARY' },
  { label: 'Transportasi', value: 'TRANSPORTATION' },
  { label: 'Lainnya', value: 'OTHER' },
];

function formatDate(d: string) {
  const dt = new Date(d);
  return `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}/${dt.getFullYear()}`;
}

export function ExpenseManager({ rows, total, summary }: { rows: Array<ExpenseRow & { profiles?: { full_name: string } | null }>; total: number; summary: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExpenseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');

  const openCreate = () => {
    setEditing(null);
    setCategory('');
    setAmount('');
    setDate(new Date().toISOString().slice(0, 10));
    setDescription('');
    setOpen(true);
  };

  const openEdit = (row: ExpenseRow) => {
    setEditing(row);
    setCategory(row.category);
    setAmount(String(row.amount_cents / 100));
    setDate(row.expense_date.slice(0, 10));
    setDescription(row.description ?? '');
    setOpen(true);
  };

  const onSave = async () => {
    if (!category) {
      toast.error('Kategori wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateExpenseAction(editing.id, {
          category: category as ExpenseCategory,
          expense_date: date,
          description: description || null,
        });
        toast.success('Pengeluaran diperbarui');
      } else {
        const amountNum = Math.round(Number(amount));
        if (!amountNum || amountNum <= 0) {
          toast.error('Jumlah wajib diisi');
          return;
        }
        await createExpenseAction({
          category: category as ExpenseCategory,
          amount_cents: amountNum * 100,
          expense_date: date,
          description: description || null,
        });
        toast.success('Pengeluaran dicatat');
      }
      setOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onDelete = async (id: string) => {
    try {
      await deleteExpenseAction(id);
      toast.success('Pengeluaran dihapus');
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    }
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[13px] text-muted-foreground">
          Total bulan ini: <Money cents={summary} strong />
        </span>
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Catat pengeluaran
        </Button>
      </div>

      {rows.length === 0 ? (
        <EmptyState title="Belum ada pengeluaran" description="Catat sewa, utilitas, gaji, dan biaya lainnya." actionLabel="Catat pengeluaran pertama" onAction={openCreate} />
      ) : (
        <div className="flex flex-col gap-2">
          {rows.map((row) => (
            <div key={row.id} className="flex items-center justify-between gap-3 border border-border bg-card px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">{row.category.replace(/_/g, ' ')}</span>
                  <span className="text-xs text-muted-foreground">{formatDate(row.expense_date)}</span>
                </div>
                <p className="m-0 truncate text-[13px] text-muted-foreground">{row.description || '—'}</p>
              </div>
              <Money cents={row.amount_cents} strong />
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                  Ubah
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon-sm" aria-label="Hapus" className="text-destructive hover:text-destructive">
                      <Trash2 className="size-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Hapus pengeluaran ini?</AlertDialogTitle>
                      <AlertDialogDescription>Tindakan ini tidak dapat dibatalkan.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Batal</AlertDialogCancel>
                      <AlertDialogAction onClick={() => void onDelete(row.id)}>Hapus</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
          {total > rows.length ? (
            <p className="text-center text-xs text-muted-foreground">
              Menampilkan {rows.length} dari {total}
            </p>
          ) : null}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? 'Ubah pengeluaran' : 'Catat pengeluaran'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Kategori</Label>
              <Select value={category} onValueChange={(v) => setCategory(v as ExpenseCategory)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Pilih kategori" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Jumlah (Rp)</Label>
              <Input
                type="number"
                min={0}
                placeholder="0"
                value={amount}
                disabled={!!editing}
                onChange={(e) => setAmount(e.target.value)}
              />
              {editing ? (
                <p className="m-0 text-xs text-muted-foreground">
                  Jumlah tidak dapat diubah setelah dibuat — koreksi dengan menghapus lalu mencatat ulang.
                </p>
              ) : null}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Tanggal</Label>
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Deskripsi</Label>
              <Textarea rows={2} placeholder="Untuk apa pengeluaran ini?" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void onSave()} disabled={saving}>
              {saving ? 'Menyimpan…' : 'Simpan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

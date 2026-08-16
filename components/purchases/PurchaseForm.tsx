'use client';

import { Plus, Trash2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createPurchaseAction } from '@/app/(app)/purchases/actions';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cartTotals } from '@/lib/pricing/pricing';
import { safeMessage } from '@/lib/utils/errors';
import { formatMoney } from '@/lib/utils/money';

export interface PurchaseBookOption {
  id: string;
  title: string;
  isbn: string | null;
}

interface LineItem {
  book_id: string;
  quantity: number;
  unit_cost: number;
}

export function PurchaseForm({
  suppliers,
  books,
  embedded,
  onDone,
  onCancel,
}: {
  suppliers: Array<{ id: string; name: string }>;
  books: PurchaseBookOption[];
  /** Render inside a Modal: hides the page-back button and reports completion instead of navigating. */
  embedded?: boolean;
  onDone?: (purchaseId: string) => void;
  onCancel?: () => void;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState<LineItem[]>([]);
  const [discount, setDiscount] = useState('0');
  const [shipping, setShipping] = useState('0');
  const [tax, setTax] = useState('0');
  const [notes, setNotes] = useState('');

  const discountCents = Math.round((Number(discount) || 0) * 100);
  const shippingCents = Math.round((Number(shipping) || 0) * 100);
  const taxCents = Math.round((Number(tax) || 0) * 100);
  const totals = cartTotals(
    items.map((i) => ({ unitPriceCents: Math.round((i.unit_cost ?? 0) * 100), quantity: i.quantity ?? 0 })),
    discountCents + shippingCents + taxCents,
  );

  const setItem = (index: number, patch: Partial<LineItem>) =>
    setItems((prev) => prev.map((it, i) => (i === index ? { ...it, ...patch } : it)));

  const addItem = () => setItems((prev) => [...prev, { book_id: '', quantity: 1, unit_cost: 0 }]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error('Pilih pemasok');
      return;
    }
    if (!invoiceNumber.trim()) {
      toast.error('Nomor faktur wajib diisi');
      return;
    }
    const validItems = items.filter((i) => i.book_id && i.quantity > 0);
    if (validItems.length === 0) {
      toast.error('Tambah minimal satu item');
      return;
    }
    setSaving(true);
    try {
      const { id } = await createPurchaseAction({
        supplier_id: supplierId,
        invoice_number: invoiceNumber,
        purchase_date: purchaseDate,
        items: validItems.map((i) => ({
          book_id: i.book_id,
          quantity: i.quantity,
          unit_cost_cents: Math.round((i.unit_cost || 0) * 100),
        })),
        discount_cents: discountCents,
        shipping_cents: shippingCents,
        tax_cents: taxCents,
        notes: notes || null,
      });
      toast.success('Pembelian dibuat (DRAF)');
      if (embedded) {
        onDone?.(id);
      } else {
        router.push(`/purchases/${id}`);
      }
    } catch (err) {
      toast.error(safeMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Pemasok</Label>
          <Select value={supplierId} onValueChange={setSupplierId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Pilih pemasok" />
            </SelectTrigger>
            <SelectContent>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-invoice">Nomor faktur</Label>
          <Input id="p-invoice" placeholder="cth. SUP-00123" value={invoiceNumber} onChange={(e) => setInvoiceNumber(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-date">Tanggal pembelian</Label>
          <Input id="p-date" type="date" value={purchaseDate} onChange={(e) => setPurchaseDate(e.target.value)} />
        </div>
      </div>

      <div>
        <p className="m-0 mb-2 text-sm font-semibold">Item</p>
        <div className="flex flex-col gap-2">
          {items.map((item, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-2">
              <Select value={item.book_id} onValueChange={(v) => setItem(idx, { book_id: v })}>
                <SelectTrigger className="min-w-[200px] flex-1">
                  <SelectValue placeholder="Cari buku" />
                </SelectTrigger>
                <SelectContent>
                  {books.map((b) => (
                    <SelectItem key={b.id} value={b.id}>
                      {b.title}
                      {b.isbn ? ` — ${b.isbn}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                className="w-[80px]"
                placeholder="Jml"
                value={item.quantity}
                onChange={(e) => setItem(idx, { quantity: Math.max(1, Number(e.target.value) || 1) })}
              />
              <div className="flex items-center gap-1">
                <span className="text-xs text-muted-foreground">Rp</span>
                <Input
                  type="number"
                  min={0}
                  className="w-[120px]"
                  placeholder="Harga"
                  value={item.unit_cost}
                  onChange={(e) => setItem(idx, { unit_cost: Number(e.target.value) || 0 })}
                />
              </div>
              <Button type="button" variant="ghost" size="icon-sm" className="text-destructive hover:text-destructive" onClick={() => setItems((prev) => prev.filter((_, i) => i !== idx))} aria-label="Hapus item">
                <Trash2 className="size-4" />
              </Button>
            </div>
          ))}
          <Button type="button" variant="outline" className="w-full border-dashed" onClick={addItem}>
            <Plus className="size-4" />
            Tambah item
          </Button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-discount">Diskon (Rp)</Label>
          <Input id="p-discount" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-shipping">Ongkir (Rp)</Label>
          <Input id="p-shipping" type="number" min={0} value={shipping} onChange={(e) => setShipping(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="p-tax">Pajak (Rp)</Label>
          <Input id="p-tax" type="number" min={0} value={tax} onChange={(e) => setTax(e.target.value)} />
        </div>
      </div>

      <p className="m-0 text-right text-[13px] text-muted-foreground">
        Subtotal: <b className="tabular-nums">{formatMoney(totals.subtotalCents)}</b>
        <br />
        Total: <b className="tabular-nums text-lg">{formatMoney(totals.totalCents)}</b>
      </p>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="p-notes">Catatan</Label>
        <Textarea id="p-notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <div className="flex items-center justify-end gap-2">
        {embedded ? (
          <Button type="button" variant="outline" onClick={onCancel}>
            Batal
          </Button>
        ) : null}
        <Button type="submit" disabled={saving}>
          {saving ? 'Menyimpan…' : 'Buat pembelian'}
        </Button>
      </div>
    </form>
  );
}

'use client';

import { ArrowLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createBookAction, updateBookAction } from '@/app/(app)/books/actions';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import type { BookInput } from '@/lib/services/books';
import { safeMessage } from '@/lib/utils/errors';

const toCents = (v?: number) => Math.round((v ?? 0) * 100);
const toDollars = (cents: number) => cents / 100;

export interface BookFormProps {
  mode: 'create' | 'edit';
  bookId?: string;
  initialValues?: Partial<BookInput>;
  categories: Array<{ id: string; name: string }>;
  publishers: Array<{ id: string; name: string }>;
  /** Render inside a Modal: hides the page-back button and reports completion instead of navigating. */
  embedded?: boolean;
  onDone?: (bookId?: string) => void;
  onCancel?: () => void;
}

interface FormState {
  title: string;
  author: string;
  isbn: string;
  barcode: string;
  description: string;
  category_id: string;
  publisher_id: string;
  publication_year: string;
  edition: string;
  language: string;
  purchasePrice: string;
  sellingPrice: string;
  minimum_stock: string;
  location: string;
  status: string;
}

export function BookForm({ mode, bookId, initialValues, categories, publishers, embedded, onDone, onCancel }: BookFormProps) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<FormState>(() => ({
    title: initialValues?.title ?? '',
    author: initialValues?.author ?? '',
    isbn: initialValues?.isbn ?? '',
    barcode: initialValues?.barcode ?? '',
    description: initialValues?.description ?? '',
    category_id: initialValues?.category_id ?? '',
    publisher_id: initialValues?.publisher_id ?? '',
    publication_year: initialValues?.publication_year != null ? String(initialValues.publication_year) : '',
    edition: initialValues?.edition ?? '',
    language: initialValues?.language ?? 'Indonesia',
    purchasePrice: initialValues?.purchase_price_cents != null ? String(toDollars(initialValues.purchase_price_cents)) : '',
    sellingPrice: initialValues?.selling_price_cents != null ? String(toDollars(initialValues.selling_price_cents)) : '',
    minimum_stock: initialValues?.minimum_stock != null ? String(initialValues.minimum_stock) : '0',
    location: initialValues?.location ?? '',
    status: (initialValues?.status as string) ?? 'ACTIVE',
  }));

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.title.trim()) {
      toast.error('Judul wajib diisi');
      return;
    }
    if (!values.author.trim()) {
      toast.error('Pengarang wajib diisi');
      return;
    }
    if (!values.sellingPrice || Number(values.sellingPrice) <= 0) {
      toast.error('Harga jual wajib diisi');
      return;
    }
    setSaving(true);
    const input: BookInput = {
      title: values.title.trim(),
      author: values.author.trim(),
      isbn: values.isbn || null,
      barcode: values.barcode || null,
      description: values.description || null,
      category_id: values.category_id || null,
      publisher_id: values.publisher_id || null,
      publication_year: values.publication_year ? Number(values.publication_year) : null,
      edition: values.edition || null,
      language: values.language || 'Indonesia',
      purchase_price_cents: toCents(Number(values.purchasePrice) || 0),
      selling_price_cents: toCents(Number(values.sellingPrice) || 0),
      minimum_stock: Number(values.minimum_stock) || 0,
      location: values.location || null,
      status: (values.status as BookInput['status']) ?? 'ACTIVE',
    };
    try {
      if (mode === 'create') {
        const { id } = await createBookAction(input);
        toast.success('Buku dibuat');
        if (embedded) {
          onDone?.(id);
        } else {
          router.push(`/books/${id}?tab=images`);
        }
      } else if (bookId) {
        await updateBookAction(bookId, input);
        toast.success('Buku disimpan');
        if (embedded) {
          onDone?.(bookId);
        } else {
          router.refresh();
        }
      }
    } catch (err) {
      toast.error(safeMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
        <Tabs defaultValue="basic">
          <TabsList>
            <TabsTrigger value="basic">Informasi Dasar</TabsTrigger>
            <TabsTrigger value="publishing">Penerbitan</TabsTrigger>
            <TabsTrigger value="pricing">Harga &amp; Stok</TabsTrigger>
          </TabsList>

          <TabsContent value="basic" className="flex flex-col gap-3 pt-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-title">Judul</Label>
              <Input id="b-title" placeholder="Judul buku" value={values.title} onChange={set('title')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-author">Pengarang</Label>
              <Input id="b-author" placeholder="Nama pengarang" value={values.author} onChange={set('author')} />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-isbn">ISBN</Label>
                <Input id="b-isbn" placeholder="978-0-000-00000-0" value={values.isbn} onChange={set('isbn')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-barcode">Barcode</Label>
                <Input id="b-barcode" placeholder="Barcode / EAN" value={values.barcode} onChange={set('barcode')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="b-desc">Deskripsi</Label>
              <Textarea id="b-desc" rows={3} placeholder="Deskripsi singkat (opsional)" value={values.description} onChange={set('description')} />
            </div>
          </TabsContent>

          <TabsContent value="publishing" className="flex flex-col gap-3 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label>Kategori</Label>
                <Select value={values.category_id} onValueChange={(v) => setValues((s) => ({ ...s, category_id: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih kategori" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Penerbit</Label>
                <Select value={values.publisher_id} onValueChange={(v) => setValues((s) => ({ ...s, publisher_id: v }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Pilih penerbit" />
                  </SelectTrigger>
                  <SelectContent>
                    {publishers.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-year">Tahun</Label>
                <Input id="b-year" type="number" min={1000} max={2100} placeholder="2024" value={values.publication_year} onChange={set('publication_year')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-edition">Edisi</Label>
                <Input id="b-edition" placeholder="1" value={values.edition} onChange={set('edition')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-language">Bahasa</Label>
                <Input id="b-language" placeholder="Indonesia" value={values.language} onChange={set('language')} />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pricing" className="flex flex-col gap-3 pt-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-purchase">Harga beli (Rp)</Label>
                <Input id="b-purchase" type="number" min={0} placeholder="0" value={values.purchasePrice} onChange={set('purchasePrice')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-selling">Harga jual (Rp)</Label>
                <Input id="b-selling" type="number" min={0} placeholder="0" value={values.sellingPrice} onChange={set('sellingPrice')} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-minstock">Stok minimum</Label>
                <Input id="b-minstock" type="number" min={0} placeholder="0" value={values.minimum_stock} onChange={set('minimum_stock')} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="b-location">Rak / lokasi</Label>
                <Input id="b-location" placeholder="cth. A-12" value={values.location} onChange={set('location')} />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select value={values.status} onValueChange={(v) => setValues((s) => ({ ...s, status: v }))}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Aktif (dapat dijual)</SelectItem>
                  <SelectItem value="INACTIVE">Nonaktif (disembunyikan dari POS)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <p className="m-0 text-xs text-muted-foreground">Stok dikelola dari halaman Stok — tidak pernah diubah di sini.</p>
          </TabsContent>
        </Tabs>

        <div className="flex items-center justify-between">
          {embedded ? (
            <Button type="button" variant="outline" onClick={onCancel}>
              Batal
            </Button>
          ) : (
            <Button type="button" variant="outline" onClick={() => router.back()}>
              <ArrowLeft className="size-4" />
              Batal
            </Button>
          )}
          <Button type="submit" disabled={saving}>
            {saving ? 'Menyimpan…' : mode === 'create' ? 'Buat buku' : 'Simpan perubahan'}
          </Button>
        </div>
      </form>
    </Card>
  );
}

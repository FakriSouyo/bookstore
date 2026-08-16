'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { saveSettingsAction } from '@/app/(app)/settings/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { safeMessage } from '@/lib/utils/errors';
import type { StoreSettingsRow } from '@/types/database';

export function SettingsForm({ settings }: { settings: StoreSettingsRow }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState({
    store_name: settings.store_name ?? '',
    store_address: settings.store_address ?? '',
    store_phone: settings.store_phone ?? '',
    receipt_width: (settings.receipt_width as '58' | '80') ?? '58',
    receipt_footer: settings.receipt_footer ?? '',
    currency: settings.currency ?? 'IDR',
    max_discount_percent: String(settings.max_discount_percent ?? 100),
    tax_rate_bps: String(settings.tax_rate_bps ?? 0),
    allow_negative_stock: !!settings.allow_negative_stock,
  });

  const set = (key: keyof typeof values) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((v) => ({ ...v, [key]: e.target.value }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!values.store_name.trim()) {
      toast.error('Nama toko wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await saveSettingsAction({
        store_name: values.store_name,
        store_address: values.store_address || null,
        store_phone: values.store_phone || null,
        receipt_footer: values.receipt_footer || null,
        receipt_width: values.receipt_width as '58' | '80',
        currency: values.currency.toUpperCase(),
        allow_negative_stock: values.allow_negative_stock,
        max_discount_percent: Number(values.max_discount_percent) || 100,
        tax_rate_bps: Number(values.tax_rate_bps) || 0,
      });
      toast.success('Pengaturan tersimpan');
      router.refresh();
    } catch (err) {
      toast.error(safeMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Identitas toko</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-name">Nama toko</Label>
            <Input id="s-name" placeholder="Toko Buku Saya" value={values.store_name} onChange={set('store_name')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-address">Alamat</Label>
            <Textarea id="s-address" rows={2} placeholder="Jalan, kota" value={values.store_address} onChange={set('store_address')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-phone">Telepon</Label>
            <Input id="s-phone" placeholder="+62 812 0000 0000" value={values.store_phone} onChange={set('store_phone')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Struk</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Lebar kertas thermal</Label>
            <Select value={values.receipt_width} onValueChange={(v) => setValues((s) => ({ ...s, receipt_width: v as '58' | '80' }))}>
              <SelectTrigger className="w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="58">58mm</SelectItem>
                <SelectItem value="80">80mm</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-footer">Teks bawah struk</Label>
            <Textarea id="s-footer" rows={2} placeholder="Terima kasih! Retur hanya dalam 7 hari." value={values.receipt_footer} onChange={set('receipt_footer')} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Harga &amp; aturan stok</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-currency">Kode mata uang</Label>
            <Input id="s-currency" placeholder="IDR" className="w-[120px]" maxLength={3} value={values.currency} onChange={set('currency')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-discount">Diskon maksimal (%) — dipaksakan di sisi server pada POS</Label>
            <Input id="s-discount" type="number" min={0} max={100} className="w-[140px]" value={values.max_discount_percent} onChange={set('max_discount_percent')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="s-tax">Tarif pajak (basis poin — 0 = nonaktif, 2500 = 25%)</Label>
            <Input id="s-tax" type="number" min={0} max={10000} className="w-[140px]" value={values.tax_rate_bps} onChange={set('tax_rate_bps')} />
          </div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="s-negative">Izinkan stok negatif (khusus — NONAKTIF secara default)</Label>
            <Switch id="s-negative" checked={values.allow_negative_stock} onCheckedChange={(c) => setValues((v) => ({ ...v, allow_negative_stock: c }))} />
          </div>
          <p className="m-0 text-xs text-muted-foreground">Semua perubahan stok tetap melalui mesin inventori apa pun nilai flag ini.</p>
        </CardContent>
      </Card>

      <Button type="submit" disabled={saving} className="w-fit">
        {saving ? 'Menyimpan…' : 'Simpan pengaturan'}
      </Button>
    </form>
  );
}

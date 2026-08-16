'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createEntryAction, setActiveAction, updateEntryAction } from '@/app/(app)/catalog/actions';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { CatalogTable } from '@/lib/services/catalog';
import type { CatalogInput } from '@/app/(app)/catalog/actions';
import { safeMessage } from '@/lib/utils/errors';

interface FieldDef {
  key: string;
  label: string;
  textarea?: boolean;
}

const CONFIGS: Record<CatalogTable, { title: string; fields: FieldDef[]; hasActive: boolean }> = {
  categories: { title: 'Kategori', fields: [{ key: 'description', label: 'Deskripsi', textarea: true }], hasActive: true },
  publishers: { title: 'Penerbit', fields: [{ key: 'country', label: 'Negara' }], hasActive: false },
  suppliers: {
    title: 'Pemasok',
    fields: [
      { key: 'contact_person', label: 'Narahubung' },
      { key: 'phone', label: 'Telepon' },
      { key: 'email', label: 'Email' },
      { key: 'address', label: 'Alamat' },
    ],
    hasActive: true,
  },
};

/** Proper singular/plural Indonesian labels (slice(0,-1) is wrong — "Kategori" is already singular). */
const ITEM_LABELS: Record<CatalogTable, { singular: string; plural: string }> = {
  categories: { singular: 'kategori', plural: 'kategori' },
  publishers: { singular: 'penerbit', plural: 'penerbit' },
  suppliers: { singular: 'pemasok', plural: 'pemasok' },
};

interface Row {
  id: string;
  name: string;
  is_active?: boolean;
  [key: string]: unknown;
}

export function CatalogManager({ table, initialData }: { table: CatalogTable; initialData: Row[] }) {
  const router = useRouter();
  const cfg = CONFIGS[table];
  const labels = ITEM_LABELS[table];
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Row | null>(null);
  const [saving, setSaving] = useState(false);
  const [values, setValues] = useState<Record<string, string>>({});

  const openCreate = () => {
    setEditing(null);
    setValues({});
    setModalOpen(true);
  };
  const openEdit = (row: Row) => {
    setEditing(row);
    setValues(Object.fromEntries(cfg.fields.map((f) => [f.key, String(row[f.key] ?? '')])));
    setModalOpen(true);
  };

  const onSave = async () => {
    if (!values.name?.trim()) {
      toast.error('Nama wajib diisi');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await updateEntryAction(table, editing.id, values as CatalogInput);
        toast.success(`${labels.singular} diperbarui`);
      } else {
        await createEntryAction(table, { ...(values as CatalogInput), name: values.name ?? '' });
        toast.success(`${labels.singular} dibuat`);
      }
      setModalOpen(false);
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onToggle = async (row: Row, checked: boolean) => {
    try {
      await setActiveAction(table, row.id, checked);
      toast.success(checked ? 'Diaktifkan' : 'Dinonaktifkan');
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    }
  };

  const columns: DataColumn<Row>[] = [
    { key: 'name', header: 'Nama', render: (row) => <span className="font-medium">{String(row.name)}</span> },
    ...cfg.fields.map((f) => ({ key: f.key, header: f.label, render: (row: Row) => (row[f.key] ? String(row[f.key]) : '—') })),
    ...(cfg.hasActive
      ? [
          {
            key: 'active',
            header: 'Aktif',
            render: (row: Row) => <Switch checked={!!row.is_active} onCheckedChange={(c) => onToggle(row, c)} />,
          },
        ]
      : []),
    {
      key: 'actions',
      header: 'Aksi',
      render: (row) => (
        <Button variant="link" size="sm" className="h-7 px-1.5" onClick={() => openEdit(row)}>
          Ubah
        </Button>
      ),
    },
  ];

  return (
    <div>
      <div className="mb-4">
        <Button onClick={openCreate}>
          <Plus className="size-4" />
          Buat {cfg.title}
        </Button>
      </div>
      {initialData.length === 0 ? (
        <EmptyState title={`Belum ada ${labels.plural}`} actionLabel={`Tambah ${labels.singular} pertama`} onAction={openCreate} />
      ) : (
        <ResponsiveTable<Row>
          rowKey="id"
          columns={columns}
          data={initialData}
          pagination={{ current: 1, pageSize: 20, total: initialData.length }}
        />
      )}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{editing ? `Ubah ${cfg.title}` : `Buat ${cfg.title}`}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="c-name">Nama</Label>
              <Input id="c-name" placeholder="Nama" value={values.name ?? ''} onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))} />
            </div>
            {cfg.fields.map((f) =>
              f.textarea ? (
                <div className="flex flex-col gap-1.5" key={f.key}>
                  <Label htmlFor={`c-${f.key}`}>{f.label}</Label>
                  <Textarea
                    id={`c-${f.key}`}
                    rows={2}
                    placeholder={f.label}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ) : (
                <div className="flex flex-col gap-1.5" key={f.key}>
                  <Label htmlFor={`c-${f.key}`}>{f.label}</Label>
                  <Input
                    id={`c-${f.key}`}
                    placeholder={f.label}
                    value={values[f.key] ?? ''}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                  />
                </div>
              ),
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
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

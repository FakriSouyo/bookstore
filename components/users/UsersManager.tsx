'use client';

import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { createUserAction, setUserActiveAction, updateUserRoleAction } from '@/app/(app)/users/actions';
import { EmptyState } from '@/components/shared/EmptyState';
import { ResponsiveTable, type DataColumn } from '@/components/tables/ResponsiveTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { safeMessage } from '@/lib/utils/errors';
import type { AppRole, ProfileRow } from '@/types/database';

const ROLE_LABELS: Record<AppRole, string> = { OWNER: 'Pemilik', ADMIN: 'Admin', CASHIER: 'Kasir' };
const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as AppRole[];

export function UsersManager({ users, currentUserId }: { users: ProfileRow[]; currentUserId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<AppRole>('CASHIER');

  const onCreate = async () => {
    if (!fullName.trim() || !email.trim()) {
      toast.error('Nama dan email wajib diisi');
      return;
    }
    setSaving(true);
    try {
      await createUserAction({ email, full_name: fullName, role });
      toast.success('Pengguna dibuat — mereka dapat masuk sekarang');
      setOpen(false);
      setFullName('');
      setEmail('');
      setRole('CASHIER');
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const onRole = async (userId: string, newRole: AppRole) => {
    try {
      await updateUserRoleAction(userId, newRole);
      toast.success('Peran diperbarui');
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    }
  };

  const onActive = async (userId: string, active: boolean) => {
    try {
      await setUserActiveAction(userId, active);
      toast.success(active ? 'Pengguna diaktifkan' : 'Pengguna dinonaktifkan');
      router.refresh();
    } catch (e) {
      toast.error(safeMessage(e));
    }
  };

  const columns: DataColumn<ProfileRow>[] = [
    {
      key: 'name',
      header: 'Nama',
      render: (row) => (
        <span className="font-medium">
          {(row.full_name || '—') + (row.id === currentUserId ? ' (kamu)' : '')}
        </span>
      ),
    },
    {
      key: 'role',
      header: 'Peran',
      render: (row) => (
        <div className="flex items-center gap-2">
          <Badge variant={row.role === 'OWNER' ? 'warning' : row.role === 'ADMIN' ? 'info' : 'muted'}>
            {ROLE_LABELS[row.role]}
          </Badge>
          {row.id !== currentUserId && (
            <Select value={row.role} onValueChange={(v) => onRole(row.id, v as AppRole)}>
              <SelectTrigger className="h-7 w-[110px] px-2 text-xs" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((r) => (
                  <SelectItem key={r} value={r}>
                    {ROLE_LABELS[r]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Aktif',
      render: (row) => <Switch checked={!!row.is_active} disabled={row.id === currentUserId} onCheckedChange={(c) => onActive(row.id, c)} />,
    },
    { key: 'phone', header: 'Telepon', priority: 'tablet', render: (row) => row.phone ?? '—' },
    { key: 'joined', header: 'Bergabung', priority: 'tablet', render: (row) => row.created_at?.slice(0, 10) ?? '—' },
  ];

  return (
    <div>
      <div className="mb-4">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" />
          Undang pengguna
        </Button>
      </div>
      {users.length === 0 ? (
        <EmptyState title="Belum ada pengguna" description="Undang anggota staf pertama." />
      ) : (
        <ResponsiveTable<ProfileRow>
          rowKey="id"
          columns={columns}
          data={users}
          pagination={{ current: 1, pageSize: 20, total: users.length }}
        />
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Undang pengguna baru</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-name">Nama lengkap</Label>
              <Input id="u-name" placeholder="Nama kasir" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" placeholder="nama@bookstore.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Peran</Label>
              <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <p className="m-0 text-xs text-muted-foreground">
              Kata sandi sementara dibuat; pengguna dapat mengatur ulang melalui halaman masuk.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Batal
            </Button>
            <Button onClick={() => void onCreate()} disabled={saving}>
              {saving ? 'Membuat…' : 'Buat pengguna'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

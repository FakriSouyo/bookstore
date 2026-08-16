'use client';

import { Badge } from '@/components/ui/badge';

type Domain = 'book' | 'purchase' | 'sale' | 'payment';

type BadgeVariant = 'success' | 'warning' | 'destructive' | 'info' | 'muted' | 'outline';

const MAPS: Record<Domain, Record<string, { variant: BadgeVariant; label: string }>> = {
  book: {
    ACTIVE: { variant: 'success', label: 'Aktif' },
    INACTIVE: { variant: 'muted', label: 'Nonaktif' },
    ARCHIVED: { variant: 'destructive', label: 'Diarsipkan' },
  },
  purchase: {
    DRAFT: { variant: 'muted', label: 'Draf' },
    ORDERED: { variant: 'info', label: 'Dipesan' },
    RECEIVED: { variant: 'info', label: 'Diterima' },
    COMPLETED: { variant: 'success', label: 'Selesai' },
    CANCELLED: { variant: 'destructive', label: 'Dibatalkan' },
  },
  sale: {
    COMPLETED: { variant: 'success', label: 'Selesai' },
    VOIDED: { variant: 'destructive', label: 'Dibatalkan' },
    REFUNDED: { variant: 'warning', label: 'Dikembalikan' },
    PARTIALLY_REFUNDED: { variant: 'warning', label: 'Dikembalikan sebagian' },
  },
  payment: {
    PENDING: { variant: 'warning', label: 'Menunggu' },
    PARTIAL: { variant: 'warning', label: 'Sebagian' },
    PAID: { variant: 'success', label: 'Lunas' },
    REFUNDED: { variant: 'muted', label: 'Dikembalikan' },
  },
};

export function StatusTag({ domain, value }: { domain: Domain; value: string }) {
  const cfg = MAPS[domain][value] ?? { variant: 'muted' as BadgeVariant, label: value };
  return <Badge variant={cfg.variant}>{cfg.label}</Badge>;
}

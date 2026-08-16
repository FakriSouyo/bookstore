'use client';

import { ShoppingCart } from 'lucide-react';

import { KpiCard } from '@/components/shared/KpiCard';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatMoney } from '@/lib/utils/money';

export interface DashboardKpis {
  revenue_cents: number;
  transactions: number;
  items_sold: number;
  profit_cents: number;
  stock_value_cents: number;
  low_stock_count: number;
  out_of_stock_count: number;
  purchases_cents: number;
}

export function DashboardClient({
  role,
  fullName,
  todayLabel,
  kpis,
  charts,
  myRevenueCents,
  myCount,
}: {
  role: string;
  fullName: string;
  todayLabel: string;
  kpis: DashboardKpis | null;
  /** Chart section — streamed from the server via Suspense. */
  charts?: React.ReactNode;
  myRevenueCents: number;
  myCount: number;
}) {
  if (role === 'CASHIER') {
    return (
      <div>
        <PageHeader title="Dasbor" subtitle={`Selamat datang kembali, ${fullName}`} />
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Penjualan saya hari ini" value={formatMoney(myRevenueCents)} />
          <KpiCard label="Transaksi hari ini" value={myCount} />
          <Card>
            <CardContent className="flex flex-col gap-2">
              <span className="text-[13px] text-muted-foreground">Ruang kerja kamu</span>
              <Button asChild className="w-full">
                <a href="/pos">
                  <ShoppingCart className="size-4" />
                  Buka POS
                </a>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHeader title="Dasbor" subtitle={`Ringkasan ${todayLabel}`} />
      <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Pendapatan hari ini" value={formatMoney(kpis?.revenue_cents ?? 0)} />
        <KpiCard label="Transaksi" value={kpis?.transactions ?? 0} />
        <KpiCard label="Item terjual" value={kpis?.items_sold ?? 0} />
        <KpiCard label="Keuntungan hari ini" value={formatMoney(kpis?.profit_cents ?? 0)} />
        <KpiCard label="Nilai stok" value={formatMoney(kpis?.stock_value_cents ?? 0)} />
        <KpiCard label="Stok menipis" value={kpis?.low_stock_count ?? 0} />
        <KpiCard label="Stok habis" value={kpis?.out_of_stock_count ?? 0} />
        <KpiCard label="Pembelian diterima" value={formatMoney(kpis?.purchases_cents ?? 0)} />
      </div>
      {charts}
    </div>
  );
}

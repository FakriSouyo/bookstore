'use client';

import {
  CartesianGrid,
  Line,
  LineChart,
  Bar,
  BarChart,
  ResponsiveContainer,
  Tooltip as ReTooltip,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton shown while chart data streams in (Suspense fallback). */
export function ChartsSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={i % 2 === 0 ? 'lg:col-span-3' : 'lg:col-span-2'}>
          <Card>
            <CardContent className="flex flex-col gap-3">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-44 w-full" />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

export interface SeriesPoint {
  day: string;
  revenue_cents: number;
  profit_cents: number;
  transactions: number;
}

export interface TopSeller {
  book_id: string;
  title: string;
  total_qty: number;
  revenue_cents: number;
}

export interface CategoryRevenue {
  category: string;
  revenue_cents: number;
}

const moneyAxis = (v: number) => 'Rp ' + Math.round(v).toLocaleString('id-ID');

function EmptyChart() {
  return (
    <div className="flex h-[260px] items-center justify-center text-muted-foreground">
      Tidak ada data untuk ditampilkan.
    </div>
  );
}

export function DashboardCharts({
  series,
  topSellers,
  categories,
  loading,
}: {
  series: SeriesPoint[];
  topSellers: TopSeller[];
  categories: CategoryRevenue[];
  loading: boolean;
}) {
  if (loading) return <ChartsSkeleton />;

  const revenueData = series.map((p) => ({ day: p.day, revenue: p.revenue_cents / 100, profit: p.profit_cents / 100 }));
  const topData = topSellers.map((t) => ({ title: t.title, qty: t.total_qty }));
  const categoryData = categories.map((c) => ({ category: c.category, value: c.revenue_cents / 100 }));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Pendapatan &amp; laba (30 hari terakhir)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={revenueData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={moneyAxis} width={70} />
              <ReTooltip formatter={(v) => 'Rp ' + Math.round(Number(v)).toLocaleString('id-ID')} />
              <Legend />
              <Line type="monotone" dataKey="revenue" name="Pendapatan" stroke="var(--primary)" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="profit" name="Laba" stroke="var(--success)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Buku terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {topData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={topData} layout="vertical" margin={{ left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} />
                <YAxis type="category" dataKey="title" tick={{ fontSize: 10, fill: 'var(--muted-foreground)' }} width={110} />
                <ReTooltip />
                <Bar dataKey="qty" name="Terjual" fill="var(--primary)" radius={[0, 0, 0, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-3">
        <CardHeader>
          <CardTitle>Penjualan per kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={categoryData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="category" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
                <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} tickFormatter={moneyAxis} width={70} />
                <ReTooltip formatter={(v) => 'Rp ' + Math.round(Number(v)).toLocaleString('id-ID')} />
                <Bar dataKey="value" name="Pendapatan" fill="var(--primary)" barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Transaksi per hari</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={series}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--muted-foreground)' }} allowDecimals={false} width={40} />
              <ReTooltip />
              <Line type="monotone" dataKey="transactions" name="Transaksi" stroke="var(--warning)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
}

'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, XAxis, YAxis } from 'recharts';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
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

const PRIMARY = '#1784cb';
const SUCCESS = '#16a34a';
const WARNING = '#d97706';

const money = (v: number) => 'Rp ' + Math.round(v).toLocaleString('id-ID');
const moneyCompact = (v: number) => {
  if (v >= 1_000_000) return `Rp ${(v / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`;
  if (v >= 1_000) return `Rp ${Math.round(v / 1_000)} rb`;
  return `Rp ${Math.round(v)}`;
};
const shortDay = (d: string) => (d.length >= 10 ? d.slice(5).replace('-', '/') : d);

const chartConfig = {
  revenue: { label: 'Pendapatan', color: PRIMARY },
  profit: { label: 'Laba', color: SUCCESS },
  value: { label: 'Pendapatan', color: PRIMARY },
  transactions: { label: 'Transaksi', color: WARNING },
} satisfies ChartConfig;

function LegendChips({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className="flex items-center gap-3">
      {items.map((i) => (
        <span key={i.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <span className="size-2 shrink-0 rounded-full" style={{ background: i.color }} />
          {i.label}
        </span>
      ))}
    </div>
  );
}

function EmptyChart() {
  return (
    <div className="flex h-[240px] items-center justify-center text-muted-foreground">
      Tidak ada data untuk ditampilkan.
    </div>
  );
}

/** Baris tooltip kustom dengan format Rupiah (indikator warna + nama + nilai). */
function moneyRow(value: unknown, name: unknown, item: unknown) {
  const it = item as { color?: string; payload?: { fill?: string } };
  const dot = it.color ?? it.payload?.fill ?? 'var(--primary)';
  return (
    <div className="flex w-full items-center justify-between gap-6">
      <span className="flex items-center gap-1.5 text-muted-foreground">
        <span className="size-2 shrink-0 rounded-full" style={{ background: dot }} />
        {String(name)}
      </span>
      <span className="font-mono font-medium tabular-nums text-foreground">{money(Number(value))}</span>
    </div>
  );
}

/** Alternatif "Buku terlaris": daftar peringkat (leaderboard) — teks tidak mungkin menumpuk. */
function TopSellersList({ data }: { data: Array<{ title: string; qty: number }> }) {
  const maxQty = Math.max(1, ...data.map((d) => d.qty));
  const rows = data.slice(0, 8);
  return (
    <div className="flex flex-col gap-3">
      {rows.map((t, i) => {
        const pct = Math.round((t.qty / maxQty) * 100);
        return (
          <div key={t.title} className="flex items-center gap-2.5">
            <span
              className={`flex size-5 shrink-0 items-center justify-center rounded-[2px] text-[11px] font-bold ${
                i === 0 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-[13px] font-medium" title={t.title}>
                  {t.title}
                </span>
                <span className="shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">
                  {t.qty}
                </span>
              </div>
              <div className="mt-1 h-1.5 w-full overflow-hidden bg-muted">
                <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
              </div>
            </div>
          </div>
        );
      })}
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
  const transactionData = series.map((p) => ({ day: p.day, transactions: p.transactions }));

  return (
    <div className="grid gap-4 lg:grid-cols-5">
      {/* Pendapatan & laba — line chart (shadcn line-multiple) */}
      <Card className="lg:col-span-3">
        <CardHeader className="!py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="text-[14px]">Pendapatan &amp; laba (30 hari)</CardTitle>
            <LegendChips
              items={[
                { color: PRIMARY, label: 'Pendapatan' },
                { color: SUCCESS, label: 'Laba' },
              ]}
            />
          </div>
        </CardHeader>
        <CardContent>
          {revenueData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <LineChart data={revenueData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={shortDay}
                  minTickGap={28}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={6} tickFormatter={(v) => moneyCompact(Number(v))} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent labelFormatter={(l) => shortDay(String(l))} formatter={moneyRow} />} />
                <Line dataKey="revenue" type="natural" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                <Line dataKey="profit" type="natural" stroke="var(--color-profit)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Buku terlaris — leaderboard (teks tidak menumpuk) */}
      <Card className="lg:col-span-2">
        <CardHeader className="!py-3">
          <CardTitle className="text-[14px]">Buku terlaris</CardTitle>
        </CardHeader>
        <CardContent>
          {topData.length === 0 ? <EmptyChart /> : <TopSellersList data={topData} />}
        </CardContent>
      </Card>

      {/* Penjualan per kategori — bar chart (shadcn bar-multiple) */}
      <Card className="lg:col-span-3">
        <CardHeader className="!py-3">
          <CardTitle className="text-[14px]">Penjualan per kategori</CardTitle>
        </CardHeader>
        <CardContent>
          {categoryData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ChartContainer config={chartConfig} className="h-[230px] w-full">
              <BarChart data={categoryData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="category" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} tickMargin={6} tickFormatter={(v) => moneyCompact(Number(v))} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={moneyRow} />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[3, 3, 0, 0]} barSize={22} maxBarSize={28} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      {/* Transaksi per hari — line chart (shadcn line) */}
      <Card className="lg:col-span-2">
        <CardHeader className="!py-3">
          <CardTitle className="text-[14px]">Transaksi per hari</CardTitle>
        </CardHeader>
        <CardContent>
          {transactionData.length === 0 ? (
            <EmptyChart />
          ) : (
            <ChartContainer config={chartConfig} className="h-[230px] w-full">
              <LineChart data={transactionData} margin={{ left: 4, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="day"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={shortDay}
                  minTickGap={28}
                />
                <YAxis tickLine={false} axisLine={false} tickMargin={6} allowDecimals={false} />
                <ChartTooltip
                  cursor={{ stroke: 'var(--border)' }}
                  content={<ChartTooltipContent labelFormatter={(l) => shortDay(String(l))} />}
                />
                <Line dataKey="transactions" type="natural" stroke="var(--color-transactions)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

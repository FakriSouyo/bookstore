import { Suspense } from 'react';

import { ChartsSkeleton, DashboardCharts, type CategoryRevenue, type SeriesPoint, type TopSeller } from '@/components/dashboard/DashboardCharts';
import { createSupabaseServerClient } from '@/lib/supabase/server';

/**
 * Streams the chart data separately from the KPIs so the dashboard's headline
 * numbers paint first and the (heavier) charts follow via Suspense.
 */
export async function DashboardChartsSection({ from30, toToday }: { from30: string; toToday: string }) {
  const supabase = await createSupabaseServerClient();
  const [{ data: series }, { data: top }, { data: categories }] = await Promise.all([
    supabase.rpc('revenue_series', { p_from: from30, p_to: toToday }),
    supabase.rpc('top_sellers', { p_from: from30, p_to: toToday, p_limit: 10 }),
    supabase.rpc('sales_by_category', { p_from: from30, p_to: toToday }),
  ]);

  return (
    <DashboardCharts
      series={(series ?? []) as SeriesPoint[]}
      topSellers={(top ?? []) as TopSeller[]}
      categories={(categories ?? []) as CategoryRevenue[]}
      loading={false}
    />
  );
}

export function ChartsSection({ from30, toToday }: { from30: string; toToday: string }) {
  return (
    <Suspense fallback={<ChartsSkeleton />}>
      <DashboardChartsSection from30={from30} toToday={toToday} />
    </Suspense>
  );
}

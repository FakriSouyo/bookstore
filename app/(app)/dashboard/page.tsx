import dayjs from 'dayjs';
import 'dayjs/locale/id';

import { DashboardClient, type DashboardKpis } from '@/components/dashboard/DashboardClient';
import { ChartsSection } from '@/app/(app)/dashboard/charts-section';
import { getSessionUser } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const session = await getSessionUser();
  const supabase = await createSupabaseServerClient();

  if (session?.role === 'CASHIER') {
    const { data: mySales } = await supabase
      .from('sales')
      .select('total_cents,id')
      .eq('cashier_id', session.id)
      .gte('created_at', dayjs().startOf('day').toISOString())
      .eq('status', 'COMPLETED');
    const revenue = (mySales ?? []).reduce((s, r) => s + r.total_cents, 0);
    return (
      <DashboardClient
        role="CASHIER"
        fullName={session.fullName}
        todayLabel=""
        kpis={null}
        myRevenueCents={revenue}
        myCount={(mySales ?? []).length}
      />
    );
  }

  const today = dayjs();
  const from30 = today.subtract(29, 'day').format('YYYY-MM-DD');
  const toToday = today.format('YYYY-MM-DD');

  // KPIs resolve independently of the chart queries — the headline numbers
  // paint as soon as this RPC returns, while charts stream in afterwards.
  const { data: kpis } = await supabase.rpc('dashboard_kpis', {
    p_from: today.startOf('day').toISOString(),
    p_to: today.endOf('day').toISOString(),
  });
  const k = (kpis ?? [])[0] as DashboardKpis | undefined;

  return (
    <DashboardClient
      role={session?.role ?? 'OWNER'}
      fullName={session?.fullName ?? ''}
      todayLabel={today.locale('id').format('D MMM YYYY')}
      kpis={k ?? null}
      charts={<ChartsSection from30={from30} toToday={toToday} />}
      myRevenueCents={0}
      myCount={0}
    />
  );
}

import { notFound } from 'next/navigation';

import { AuditLogsClient, type AuditLogRow } from '@/components/audit/AuditLogsClient';
import { Panel } from '@/components/shared/Panel';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasPermission } from '@/lib/auth/guards';
import { createSupabaseServerClient } from '@/lib/supabase/server';

const PAGE_SIZE = 20;

export default async function AuditLogsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; action?: string }>;
}) {
  if (!(await hasPermission('audit:view'))) notFound();
  const sp = await searchParams;
  const page = Math.max(1, Number(sp.page) || 1);

  const supabase = await createSupabaseServerClient();
  let query = supabase.from('audit_logs').select('*,profiles(full_name)', { count: 'exact' });
  if (sp.action) query = query.eq('action', sp.action);
  const from = (page - 1) * PAGE_SIZE;
  query = query.order('created_at', { ascending: false }).range(from, from + PAGE_SIZE - 1);
  const { data, count } = await query;

  return (
    <div>
      <PageHeader title="Log Audit" subtitle="Setiap operasi penting, siapa yang melakukannya, dan kapan" />
      <Panel>
        <AuditLogsClient rows={(data ?? []) as AuditLogRow[]} page={page} total={count ?? 0} pageSize={PAGE_SIZE} />
      </Panel>
    </div>
  );
}

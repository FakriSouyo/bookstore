import { notFound } from 'next/navigation';

import { ReportPageClient } from '@/components/reports/ReportPageClient';
import { hasPermission } from '@/lib/auth/guards';
import { runReport, REPORT_KEYS, type ReportKey } from '@/lib/reports';

export default async function ReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ key: string }>;
  searchParams: Promise<{ from?: string; to?: string }>;
}) {
  const { key } = await params;
  const sp = await searchParams;
  if (!(await hasPermission('reports:view')) || !REPORT_KEYS.includes(key as ReportKey)) notFound();

  const result = await runReport(key as ReportKey, { from: sp.from, to: sp.to });
  const qs = new URLSearchParams(sp).toString();

  return <ReportPageClient result={result} keyName={key} queryString={qs} />;
}

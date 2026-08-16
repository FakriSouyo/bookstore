import { notFound } from 'next/navigation';

import { ReportsIndexClient } from '@/components/reports/ReportsIndexClient';
import { hasPermission } from '@/lib/auth/guards';
import { REPORT_KEYS, REPORTS } from '@/lib/reports';

export default async function ReportsPage() {
  if (!(await hasPermission('reports:view'))) notFound();
  return (
    <ReportsIndexClient
      reports={REPORT_KEYS.map((key) => ({ key, label: REPORTS[key].label, description: REPORTS[key].description }))}
    />
  );
}

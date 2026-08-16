import dayjs from 'dayjs';
import { notFound } from 'next/navigation';

import { ExpenseManager } from '@/components/expenses/ExpenseManager';
import { Panel } from '@/components/shared/Panel';
import { PageHeader } from '@/components/shared/PageHeader';
import { hasPermission } from '@/lib/auth/guards';
import { expensesSummary, listExpenses } from '@/lib/services/expenses';

export default async function ExpensesPage() {
  if (!(await hasPermission('expenses:view'))) notFound();

  const monthStart = dayjs().startOf('month').format('YYYY-MM-DD');
  const monthEnd = dayjs().endOf('month').format('YYYY-MM-DD');
  const [{ rows, total }, summary] = await Promise.all([
    listExpenses({ page: 1, pageSize: 100, from: monthStart, to: monthEnd }),
    expensesSummary(monthStart, monthEnd),
  ]);

  return (
    <div>
      <PageHeader title="Pengeluaran" subtitle="Biaya operasional bulan ini" />
      <Panel>
        <ExpenseManager rows={rows} total={total} summary={summary.totalCents} />
      </Panel>
    </div>
  );
}

import { cn } from '@/lib/utils';
import { formatMoney } from '@/lib/utils/money';

export function Money({
  cents,
  currency = 'IDR',
  strong,
  secondary,
  prominent,
  testId,
}: {
  cents: number;
  currency?: string;
  strong?: boolean;
  secondary?: boolean;
  /** Numeric KPI style — prominent totals (bookstore-ui). */
  prominent?: boolean;
  testId?: string;
}) {
  return (
    <span
      data-testid={testId}
      className={cn(
        'tabular-nums',
        prominent && 'text-[28px] font-bold',
        strong && !prominent && 'font-semibold',
        secondary && 'text-muted-foreground',
      )}
    >
      {formatMoney(cents, currency)}
    </span>
  );
}

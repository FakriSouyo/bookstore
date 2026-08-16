'use client';

import type { ReactNode } from 'react';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export function KpiCard({
  label,
  value,
  delta,
  loading,
}: {
  label: string;
  value: ReactNode;
  /** Optional small delta hint, e.g. "+12% vs yesterday" */
  delta?: ReactNode;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <span className="u-label" style={{ lineHeight: 1.5, letterSpacing: '0.12em' }}>
          {label}
        </span>
        {loading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <span className="tabular-nums text-[26px] leading-[1.2] font-bold">{value}</span>
        )}
        {delta ? <span className="text-xs text-muted-foreground">{delta}</span> : null}
      </CardContent>
    </Card>
  );
}

'use client';

import { ChevronRight } from 'lucide-react';

import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent } from '@/components/ui/card';

export function ReportsIndexClient({
  reports,
}: {
  reports: Array<{ key: string; label: string; description: string }>;
}) {
  return (
    <div>
      <PageHeader title="Laporan" subtitle="Pilih laporan, lalu filter berdasarkan tanggal dan ekspor" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <a key={r.key} href={`/reports/${r.key}`} className="group">
            <Card className="transition-colors hover:border-primary/50">
              <CardContent className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{r.label}</span>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="m-0 text-[13px] text-muted-foreground">{r.description}</p>
              </CardContent>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}

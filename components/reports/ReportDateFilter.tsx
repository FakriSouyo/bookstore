'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export function ReportDateFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [from, setFrom] = useState(searchParams.get('from') ?? '');
  const [to, setTo] = useState(searchParams.get('to') ?? '');

  const apply = (presetFrom?: string, presetTo?: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (presetFrom && presetTo) {
      params.set('from', presetFrom);
      params.set('to', presetTo);
    } else if (from && to) {
      params.set('from', from);
      params.set('to', to);
    }
    router.push(`${pathname}?${params.toString()}`);
  };

  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10);
  const todayStr = today.toISOString().slice(0, 10);
  const from30 = new Date(today.getTime() - 29 * 86400000).toISOString().slice(0, 10);

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="flex flex-col gap-1">
        <Label htmlFor="from" className="text-xs">
          Dari
        </Label>
        <Input id="from" type="date" className="w-[150px]" value={from} onChange={(e) => setFrom(e.target.value)} />
      </div>
      <div className="flex flex-col gap-1">
        <Label htmlFor="to" className="text-xs">
          Sampai
        </Label>
        <Input id="to" type="date" className="w-[150px]" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      <Button variant="outline" size="sm" onClick={() => apply(monthStart, todayStr)}>
        Bulan ini
      </Button>
      <Button variant="outline" size="sm" onClick={() => apply(from30, todayStr)}>
        30 hari terakhir
      </Button>
      <Button size="sm" onClick={() => apply()}>
        Terapkan
      </Button>
    </div>
  );
}

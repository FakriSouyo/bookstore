'use client';

import { Search } from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';

import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export interface FilterOptions {
  categories: Array<{ id: string; name: string }>;
  publishers: Array<{ id: string; name: string }>;
}

export function BookFilters({ options }: { options: FilterOptions }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('search') ?? '');

  const setParam = (key: string, value: string | undefined) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.delete('page');
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Cari judul, pengarang, ISBN, barcode…"
          className="w-[240px] pl-8"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setParam('search', search || undefined);
          }}
        />
      </div>

      <Select value={searchParams.get('category_id') ?? ''} onValueChange={(v) => setParam('category_id', v || undefined)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Kategori" />
        </SelectTrigger>
        <SelectContent>
          {options.categories.map((c) => (
            <SelectItem key={c.id} value={c.id}>
              {c.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get('publisher_id') ?? ''} onValueChange={(v) => setParam('publisher_id', v || undefined)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Penerbit" />
        </SelectTrigger>
        <SelectContent>
          {options.publishers.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={searchParams.get('status') ?? ''} onValueChange={(v) => setParam('status', v || undefined)}>
        <SelectTrigger className="w-[130px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="ACTIVE">Aktif</SelectItem>
          <SelectItem value="INACTIVE">Nonaktif</SelectItem>
          <SelectItem value="ARCHIVED">Diarsipkan</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}

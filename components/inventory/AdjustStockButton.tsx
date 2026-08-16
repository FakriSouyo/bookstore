'use client';

import { PackagePlus, Wrench } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';

import { AdjustStockModal } from './AdjustStockModal';

export function AdjustStockButton({
  books,
  defaultBookId,
  compact = false,
}: {
  books: Array<{ id: string; title: string; stock: number }>;
  /** Preselect a specific book (e.g. from the book detail page). */
  defaultBookId?: string;
  /** Compact row-level variant (used in list tables/cards). */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  if (compact) {
    return (
      <>
        <Button variant="outline" size="sm" className="h-7 gap-1 px-2" onClick={() => setOpen(true)}>
          <PackagePlus className="size-3.5" />
          Ubah stok
        </Button>
        <AdjustStockModal open={open} onClose={() => setOpen(false)} books={books} defaultBookId={defaultBookId} />
      </>
    );
  }
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Wrench className="size-4" />
        Catat penyesuaian
      </Button>
      <AdjustStockModal open={open} onClose={() => setOpen(false)} books={books} defaultBookId={defaultBookId} />
    </>
  );
}

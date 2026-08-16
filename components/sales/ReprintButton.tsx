'use client';

import { Printer } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { ReceiptModal } from '@/components/receipt/ReceiptModal';

export function ReprintButton({ saleId }: { saleId: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Printer className="size-4" />
        Cetak ulang struk
      </Button>
      <ReceiptModal key={saleId} saleId={saleId} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

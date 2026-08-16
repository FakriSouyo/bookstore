'use client';

import { Printer } from 'lucide-react';
import { useReactToPrint } from 'react-to-print';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { auditReceiptPrintAction, getReceiptDataAction } from '@/app/(app)/pos/actions';
import { ReceiptPrint } from '@/components/receipt/ReceiptPrint';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatMoney } from '@/lib/utils/money';
import type { ReceiptData } from '@/lib/receipt/types';
import { safeMessage } from '@/lib/utils/errors';

export function ReceiptModal({
  saleId,
  open,
  onClose,
  onDone,
}: {
  saleId: string | null;
  open: boolean;
  onClose: () => void;
  onDone?: () => void;
}) {
  const [data, setData] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open || !saleId) return;
    let cancelled = false;
    getReceiptDataAction(saleId)
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(safeMessage(e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, saleId]);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    onAfterPrint: () => {
      if (saleId) auditReceiptPrintAction(saleId).catch(() => undefined);
      toast.success('Dikirim ke printer');
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>Struk</DialogTitle>
        </DialogHeader>
        {loading ? (
          <div className="flex flex-col gap-2 py-4">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        ) : error ? (
          <p className="m-0 text-[13px] text-destructive">{error}</p>
        ) : data ? (
          <div
            className="mx-auto max-w-[320px] border border-[#e6e2dc] bg-white p-3"
            style={{ transform: 'scale(0.9)', transformOrigin: 'top center' }}
          >
            <ReceiptPreviewBody data={data} />
          </div>
        ) : null}
        <DialogFooter className="!flex-row !items-center !justify-between">
          <Button variant="outline" onClick={onClose}>
            Tutup
          </Button>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => handlePrint()} disabled={!data}>
              <Printer className="size-4" />
              Cetak
            </Button>
            <Button variant="outline" asChild>
              <a href={saleId ? `/api/receipts/${saleId}/pdf` : undefined} target="_blank" rel="noreferrer">
                Simpan PDF
              </a>
            </Button>
            <Button onClick={onDone ?? onClose}>Selesai</Button>
          </div>
        </DialogFooter>
        {data ? <ReceiptPrint ref={printRef} data={data} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function ReceiptPreviewBody({ data }: { data: ReceiptData }) {
  const money = (cents: number) => formatMoney(cents);
  return (
    <div style={{ fontFamily: "'Courier New', monospace", fontSize: 12, lineHeight: 1.5 }}>
      <div style={{ textAlign: 'center', fontWeight: 700 }}>{data.store.name}</div>
      {data.store.address ? <div style={{ textAlign: 'center' }}>{data.store.address}</div> : null}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div>Faktur: {data.sale.invoiceNumber}</div>
      {data.items.map((item, i) => (
        <div key={i}>
          <div>{item.title}</div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>
              {item.quantity} × {money(item.unitPriceCents)}
            </span>
            <span>{money(item.lineTotalCents)}</span>
          </div>
        </div>
      ))}
      <div style={{ borderTop: '1px dashed #000', margin: '6px 0' }} />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
        <span>TOTAL</span>
        <span>{money(data.totals.totalCents)}</span>
      </div>
      {data.payment.method === 'CASH' ? (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Kembalian</span>
          <span>{money(data.payment.changeCents)}</span>
        </div>
      ) : null}
      {data.sale.status !== 'COMPLETED' ? (
        <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 8 }}>*** {data.sale.status} ***</div>
      ) : null}
    </div>
  );
}

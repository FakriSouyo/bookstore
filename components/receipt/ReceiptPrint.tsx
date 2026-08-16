'use client';

import { forwardRef } from 'react';

import type { ReceiptData } from '@/lib/receipt/types';
import { formatDateTime } from '@/lib/utils/format';
import { formatMoney } from '@/lib/utils/money';

const line = { borderTop: '1px dashed #000', margin: '6px 0' } as const;

export const ReceiptPrint = forwardRef<HTMLDivElement, { data: ReceiptData }>(function ReceiptPrint(
  { data },
  ref,
) {
  const width = data.store.width === '58' ? '58mm' : '80mm';
  const money = (cents: number) => formatMoney(cents);

  return (
    <div
      id="receipt-print"
      ref={ref}
      style={{
        fontFamily: "'Courier New', Courier, monospace",
        width,
        fontSize: 12,
        lineHeight: 1.5,
        color: '#000',
        background: '#fff',
        padding: '4mm 2mm',
        display: 'none',
      }}
    >
      <div style={{ textAlign: 'center', fontWeight: 700, fontSize: 15 }}>{data.store.name}</div>
      {data.store.address ? (
        <div style={{ textAlign: 'center', whiteSpace: 'pre-wrap' }}>{data.store.address}</div>
      ) : null}
      {data.store.phone ? <div style={{ textAlign: 'center' }}>{data.store.phone}</div> : null}
      <div style={line} />
      <div>Faktur: {data.sale.invoiceNumber}</div>
      <div>Tanggal: {formatDateTime(data.sale.createdAt)}</div>
      <div>Kasir: {data.sale.cashier || '—'}</div>
      <div style={line} />
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
      <div style={line} />
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>Subtotal</span>
        <span>{money(data.totals.subtotalCents)}</span>
      </div>
      {data.totals.discountCents > 0 && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Diskon</span>
          <span>-{money(data.totals.discountCents)}</span>
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 14 }}>
        <span>TOTAL</span>
        <span>{money(data.totals.totalCents)}</span>
      </div>
      <div style={line} />
      <div>Pembayaran: {data.payment.method}</div>
      {data.payment.method === 'CASH' && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Dibayar</span>
            <span>{money(data.payment.tenderedCents)}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
            <span>Kembalian</span>
            <span>{money(data.payment.changeCents)}</span>
          </div>
        </>
      )}
      {data.sale.status !== 'COMPLETED' && (
        <div style={{ textAlign: 'center', fontWeight: 700, marginTop: 8 }}>
          *** {data.sale.status.replace(/_/g, ' ')} ***
        </div>
      )}
      {data.sale.voidReason ? <div style={{ textAlign: 'center' }}>{data.sale.voidReason}</div> : null}
      <div style={line} />
      {data.store.footer ? <div style={{ textAlign: 'center', whiteSpace: 'pre-wrap' }}>{data.store.footer}</div> : null}
      <div style={{ textAlign: 'center' }}>Terima kasih!</div>
    </div>
  );
});

/**
 * Receipt PDF fallback (skills/bookstore-receipt/SKILL.md).
 * Single portrait page sized to the configured thermal width.
 */

import type { TDocumentDefinitions } from 'pdfmake/interfaces';

import type { ReceiptData } from '@/lib/receipt/types';
import { formatDateTime } from '@/lib/utils/format';
import { formatMoney } from '@/lib/utils/money';

import { buildDocument } from './document';

const money = (cents: number) => formatMoney(cents);

export async function receiptPdf(data: ReceiptData): Promise<Buffer> {
  const widthPt = data.store.width === '58' ? 165 : 226;
  const line: Content = { canvas: [{ type: 'line', x1: 0, y1: 0, x2: widthPt - 16, y2: 0, lineWidth: 0.6, lineStyle: 'dashed' }], margin: [0, 4, 0, 4] };

  const content: Content[] = [
    { text: data.store.name, alignment: 'center', bold: true, fontSize: 11, margin: [0, 4, 0, 2] },
    ...(data.store.address ? [{ text: data.store.address, alignment: 'center', fontSize: 7 }] : []),
    ...(data.store.phone ? [{ text: data.store.phone, alignment: 'center', fontSize: 7 }] : []),
    line,
    { text: `Invoice: ${data.sale.invoiceNumber}`, fontSize: 7 },
    { text: `Date: ${formatDateTime(data.sale.createdAt)}`, fontSize: 7 },
    { text: `Cashier: ${data.sale.cashier || '—'}`, fontSize: 7 },
    line,
    ...data.items.flatMap((item) => [
      { text: item.title, fontSize: 7 },
      {
        columns: [
          { text: `${item.quantity} × ${money(item.unitPriceCents)}`, fontSize: 7 },
          { text: money(item.lineTotalCents), alignment: 'right', fontSize: 7 },
        ],
        columnGap: 4,
      },
    ]),
    line,
    {
      columns: [
        { text: 'Subtotal', fontSize: 7 },
        { text: money(data.totals.subtotalCents), alignment: 'right', fontSize: 7 },
      ],
    },
    ...(data.totals.discountCents > 0
      ? [
          {
            columns: [
              { text: 'Discount', fontSize: 7 },
              { text: `-${money(data.totals.discountCents)}`, alignment: 'right', fontSize: 7 },
            ],
          },
        ]
      : []),
    {
      columns: [
        { text: 'TOTAL', bold: true, fontSize: 10 },
        { text: money(data.totals.totalCents), alignment: 'right', bold: true, fontSize: 10 },
      ],
    },
    line,
    { text: `Payment: ${data.payment.method}`, fontSize: 7 },
    ...(data.payment.method === 'CASH'
      ? [
          {
            columns: [
              { text: 'Tendered', fontSize: 7 },
              { text: money(data.payment.tenderedCents), alignment: 'right', fontSize: 7 },
            ],
          },
          {
            columns: [
              { text: 'Change', bold: true, fontSize: 8 },
              { text: money(data.payment.changeCents), alignment: 'right', bold: true, fontSize: 8 },
            ],
          },
        ]
      : []),
    ...(data.sale.status !== 'COMPLETED'
      ? [{ text: `*** ${data.sale.status.replace(/_/g, ' ')} ***`, alignment: 'center', bold: true, fontSize: 9, margin: [0, 8, 0, 0] }]
      : []),
    ...(data.store.footer ? [{ text: data.store.footer, alignment: 'center', fontSize: 7, margin: [0, 8, 0, 0] }] : []),
    { text: 'Thank you!', alignment: 'center', fontSize: 8, margin: [0, 4, 0, 0] },
  ];

  const docDef: TDocumentDefinitions = {
    pageSize: { width: widthPt, height: 900 },
    pageMargins: [8, 8, 8, 8],
    content,
    defaultStyle: { font: 'Roboto', fontSize: 8, color: '#000000' },
  };

  return buildDocument(docDef);
}

import type { Content } from 'pdfmake/interfaces';

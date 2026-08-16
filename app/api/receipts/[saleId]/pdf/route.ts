import { NextResponse } from 'next/server';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { receiptPdf } from '@/lib/pdf/receipt';
import { buildReceiptData } from '@/lib/receipt/build';
import { AppError } from '@/lib/utils/errors';

export async function GET(_request: Request, { params }: { params: Promise<{ saleId: string }> }) {
  try {
    await requireRole('receipt:print');
    const { saleId } = await params;
    const data = await buildReceiptData(saleId);
    const buffer = await receiptPdf(data);
    await logAudit('receipt.print', { type: 'sale', id: saleId }, { format: 'pdf' });
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="receipt-${data.sale.invoiceNumber}.pdf"`,
      },
    });
  } catch (e) {
    const status = e instanceof AppError && e.code === 'AUTHZ_ERROR' ? 403 : 404;
    return NextResponse.json({ error: e instanceof AppError ? e.message : 'Not found' }, { status });
  }
}

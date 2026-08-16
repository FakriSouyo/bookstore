import { NextResponse, type NextRequest } from 'next/server';

import { logAudit } from '@/lib/audit/log';
import { requireRole } from '@/lib/auth/guards';
import { reportPdf } from '@/lib/pdf/reports';
import { runReport, REPORT_KEYS, type ReportKey } from '@/lib/reports';
import { toCsv, toXlsx } from '@/lib/reports/export';
import { AppError } from '@/lib/utils/errors';

export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  try {
    await requireRole('reports:view');
    const { key } = await params;
    if (!REPORT_KEYS.includes(key as ReportKey)) throw new AppError('NOT_FOUND', 'Unknown report.');

    const search = request.nextUrl.searchParams;
    const format = search.get('format') ?? 'csv';
    const from = search.get('from') ?? undefined;
    const to = search.get('to') ?? undefined;

    const result = await runReport(key as ReportKey, { from, to });
    await logAudit('reports.export', { type: 'report', id: key }, { format, from, to });

    const filename = `${key}-${from ?? 'all'}-${to ?? 'all'}`.replace(/[^a-z0-9-]/gi, '');

    if (format === 'xlsx') {
      const buffer = await toXlsx(result);
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          'Content-Disposition': `attachment; filename="${filename}.xlsx"`,
        },
      });
    }
    if (format === 'pdf') {
      const buffer = await reportPdf(result, { from, to });
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${filename}.pdf"`,
        },
      });
    }
    const csv = toCsv(result);
    return new NextResponse(new Uint8Array(csv), {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}.csv"`,
      },
    });
  } catch (e) {
    const message = e instanceof AppError ? e.message : 'Export failed.';
    return NextResponse.json({ error: message }, { status: e instanceof AppError && e.code === 'AUTHZ_ERROR' ? 403 : 400 });
  }
}

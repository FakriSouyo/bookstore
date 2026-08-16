/**
 * Report PDF factory (skills/bookstore-pdf/SKILL.md).
 */

import type { TDocumentDefinitions } from 'pdfmake/interfaces';

import type { ReportResult } from '@/lib/reports';
import { getSettings } from '@/lib/services/settings';

import { buildDocument } from './document';
import { pageFooter, pageHeader } from './headerFooter';
import { dataTable } from './tables';
import { pdfStyles } from './theme';

export async function reportPdf(
  result: ReportResult,
  params: { from?: string; to?: string },
): Promise<Buffer> {
  let storeName = 'My Bookstore';
  try {
    storeName = (await getSettings()).store_name;
  } catch {
    // non-fatal: fall back to default name
  }

  const meta = `Period: ${params.from ?? 'all'} → ${params.to ?? 'all'}`;
  const docDef: TDocumentDefinitions = {
    pageSize: 'A4',
    pageMargins: [40, 70, 40, 60],
    content: [
      pageHeader(storeName, result.title, meta),
      { text: `Generated ${new Date().toLocaleString()}`, style: 'muted', margin: [40, 0, 40, 12] },
      dataTable({ columns: result.columns, rows: result.rows, moneyColumns: result.moneyColumns }),
    ],
    footer: pageFooter(storeName),
    styles: pdfStyles,
    defaultStyle: { font: 'Roboto', fontSize: 9, color: '#1f1e1d' },
  };

  return buildDocument(docDef);
}

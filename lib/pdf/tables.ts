/**
 * Reusable PDF table builder (skills/bookstore-pdf/SKILL.md).
 * Money columns render right-aligned with tabular-ish spacing.
 */

import type { Content } from 'pdfmake/interfaces';

export interface PdfTableData {
  columns: string[];
  rows: Array<Record<string, unknown>>;
  moneyColumns: string[];
}

export function dataTable(data: PdfTableData): Content {
  const header = data.columns.map((c) => ({
    text: c.replace(/_/g, ' ').toUpperCase(),
    style: 'tableHeader',
    alignment: data.moneyColumns.includes(c) ? 'right' : 'left',
    margin: [4, 4],
  }));
  const body = data.rows.map((row) =>
    data.columns.map((c) => ({
      text: String(row[c] ?? ''),
      style: data.moneyColumns.includes(c) ? 'money' : 'body',
      alignment: data.moneyColumns.includes(c) ? 'right' : 'left',
      margin: [4, 2],
    })),
  );
  return {
    layout: 'lightHorizontalLines',
    table: { headerRows: 1, widths: data.columns.map(() => '*'), body: [header, ...body] },
  };
}

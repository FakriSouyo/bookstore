/**
 * Report exports (skills/bookstore-reports/SKILL.md) — server-side only.
 */

import ExcelJS from 'exceljs';

import type { ReportResult } from './index';

export function toCsv(result: ReportResult): Buffer {
  const header = result.columns.map(escapeCsv).join(',');
  const lines = result.rows.map((row) => result.columns.map((c) => escapeCsv(String(row[c] ?? ''))).join(','));
  // UTF-8 BOM so Excel opens UTF-8 content correctly.
  return Buffer.from('\uFEFF' + [header, ...lines].join('\r\n'), 'utf8');
}

function escapeCsv(value: string): string {
  if (/[",\r\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

export async function toXlsx(result: ReportResult): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(result.title.slice(0, 31));
  sheet.addRow(result.columns);
  for (const row of result.rows) {
    sheet.addRow(result.columns.map((c) => row[c] ?? ''));
  }
  sheet.getRow(1).font = { bold: true };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];
  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}

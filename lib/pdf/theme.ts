/**
 * PDF styles — mirror the app tokens (skills/bookstore-ui/SKILL.md).
 */

import type { Style } from 'pdfmake/interfaces';

export const pdfStyles: Record<string, Style> = {
  h1: { fontSize: 16, bold: true, color: '#1f1e1d' },
  h2: { fontSize: 11, bold: true, color: '#1f1e1d' },
  body: { fontSize: 9, color: '#1f1e1d' },
  muted: { color: '#6b6865', fontSize: 8 },
  tableHeader: { bold: true, fillColor: '#f7f6f4', fontSize: 8, color: '#6b6865' },
  footer: { fontSize: 7.5, color: '#6b6865' },
  total: { bold: true, fontSize: 11 },
  money: { fontSize: 9, color: '#1f1e1d' },
};

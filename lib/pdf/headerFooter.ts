/**
 * Page header/footer for report PDFs (skills/bookstore-pdf/SKILL.md).
 */

import type { Content, DynamicContent } from 'pdfmake/interfaces';

export function pageHeader(storeName: string, docTitle: string, meta?: string): Content {
  return {
    columns: [
      { text: storeName, style: 'h1' },
      {
        stack: [
          { text: docTitle, alignment: 'right', style: 'h2' },
          ...(meta ? [{ text: meta, alignment: 'right', style: 'muted' }] : []),
        ],
      },
    ],
    margin: [40, 24, 40, 8],
  };
}

export function pageFooter(storeName: string): DynamicContent {
  return (currentPage: number, pageCount: number) => ({
    text: `${storeName} · Page ${currentPage} of ${pageCount}`,
    alignment: 'center',
    style: 'footer',
    margin: [40, 0, 40, 12],
  });
}

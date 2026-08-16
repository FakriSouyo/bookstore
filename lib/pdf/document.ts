/**
 * PDF generation (skills/bookstore-pdf/SKILL.md) — server-side only.
 * pdfmake 0.3: PdfPrinter(fonts, vfs) — the bundled vfs ships Roboto.
 */

import PdfPrinter from 'pdfmake';
import type { TDocumentDefinitions } from 'pdfmake/interfaces';
import pdfMakeVfs from 'pdfmake/build/vfs_fonts';

const fonts = {
  Roboto: {
    normal: 'Roboto-Regular.ttf',
    bold: 'Roboto-Medium.ttf',
    italics: 'Roboto-Italic.ttf',
    bolditalics: 'Roboto-MediumItalic.ttf',
  },
};

export async function buildDocument(docDef: TDocumentDefinitions): Promise<Buffer> {
  const printer = new PdfPrinter(fonts, pdfMakeVfs);
  return new Promise((resolve, reject) => {
    const doc = printer.createPdfKitDocument(docDef);
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
    doc.end();
  });
}

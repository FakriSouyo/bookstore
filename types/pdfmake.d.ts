/**
 * Minimal ambient types for pdfmake 0.3.x (server-side PDF generation).
 * Replaces `@types/pdfmake`, whose 0.3.x declarations are broken for common
 * content shapes (e.g. it wrongly requires `tocItem` on every table).
 * Only the surface we use is typed here; see lib/pdf/*.
 */

declare module 'pdfmake/interfaces' {
  export interface CanvasElement {
    type: 'line' | 'rect' | 'ellipse';
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    lineWidth?: number;
    lineStyle?: string;
    color?: string;
  }

  export interface ContentBase {
    text?: string | Content;
    stack?: Content[];
    columns?: Content[];
    columnGap?: number;
    canvas?: CanvasElement[];
    style?: string | string[];
    alignment?: string;
    fontSize?: number;
    bold?: boolean;
    italics?: boolean;
    color?: string;
    fillColor?: string;
    margin?: number | number[];
    width?: number | string;
    height?: number;
    layout?: string;
    table?: {
      headerRows?: number;
      widths?: Array<number | string>;
      body: Content[][];
    };
    [key: string]: unknown;
  }

  export type Content = string | ContentBase | Content[];

  export interface Style {
    fontSize?: number;
    bold?: boolean;
    italics?: boolean;
    color?: string;
    fillColor?: string;
    alignment?: 'left' | 'center' | 'right' | 'justify';
    [key: string]: unknown;
  }

  export type DynamicContent = (currentPage: number, pageCount: number) => Content;

  export interface TDocumentDefinitions {
    content: Content | Content[];
    pageSize?: string | { width: number; height: number };
    pageMargins?: number | [number, number, number, number];
    defaultStyle?: Style;
    styles?: Record<string, Style>;
    header?: Content | DynamicContent;
    footer?: Content | DynamicContent;
    [key: string]: unknown;
  }
}

declare module 'pdfmake' {
  import type { TDocumentDefinitions } from 'pdfmake/interfaces';

  export interface PdfKitDocument {
    on(event: 'data', cb: (chunk: Buffer) => void): this;
    on(event: 'end', cb: () => void): this;
    on(event: 'error', cb: (err: Error) => void): this;
    end(): void;
  }

  export default class PdfPrinter {
    constructor(
      fonts: Record<string, Record<'normal' | 'bold' | 'italics' | 'bolditalics', string>>,
      vfs: Record<string, string>,
    );
    createPdfKitDocument(docDef: TDocumentDefinitions): PdfKitDocument;
  }
}

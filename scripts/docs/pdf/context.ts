import type { FontRole } from './glyphs.ts';
import type { FontSet } from './theme.ts';

export const MARGIN = 56;

// o que os blocos precisam do documento, sem conhecer o PdfWriter
export interface PdfContext {
  readonly doc: PDFKit.PDFDocument;
  readonly fonts: FontSet;
  readonly root: string;
  readonly width: number;
  // texto já com os glifos que a fonte tem
  safe(text: string, role?: FontRole): string;
  ensureSpace(height: number): void;
  // limite de baixo da área útil da página
  readonly bottom: number;
}

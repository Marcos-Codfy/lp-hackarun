import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';
import { ChipList } from './blocks/ChipList.ts';
import { CodeBlock } from './blocks/CodeBlock.ts';
import { TableBlock } from './blocks/TableBlock.ts';
import { TextBlocks, type InlineRun } from './blocks/TextBlocks.ts';
import { MARGIN, type PdfContext } from './context.ts';
import { CoverPage, type CoverLines } from './CoverPage.ts';
import { energyRule } from './decor.ts';
import { GlyphFallback, type FontRole } from './glyphs.ts';
import { PageChrome } from './PageChrome.ts';
import { COLORS, registerFonts, type FontSet } from './theme.ts';

export type { InlineRun } from './blocks/TextBlocks.ts';

// fachada fina sobre o pdfkit com os blocos que os documentos usam
export class PdfWriter implements PdfContext {
  readonly doc: PDFKit.PDFDocument;
  readonly fonts: FontSet;
  readonly root: string;
  private readonly title: string;
  private readonly done: Promise<void>;
  private readonly glyphs: Record<FontRole, GlyphFallback>;
  private readonly text: TextBlocks;

  constructor(outFile: string, meta: { title: string; root: string; date: Date }) {
    this.title = meta.title;
    this.root = meta.root;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN + 10, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: { Title: meta.title, Author: 'HackaRun · Unicatólica', CreationDate: meta.date },
    });
    this.fonts = registerFonts(this.doc, meta.root);
    this.glyphs = {
      display: new GlyphFallback('display', this.fonts.brand),
      text: new GlyphFallback('text', this.fonts.brand),
    };
    this.text = new TextBlocks(this);
    const stream = createWriteStream(outFile);
    this.done = new Promise((ok, fail) => {
      stream.on('finish', () => ok());
      stream.on('error', fail);
    });
    this.doc.pipe(stream);
  }

  get width(): number {
    return this.doc.page.width - MARGIN * 2;
  }

  get bottom(): number {
    return this.doc.page.height - MARGIN;
  }

  safe(text: string, role: FontRole = 'text'): string {
    return this.glyphs[role].apply(text);
  }

  cover(lines: CoverLines): void {
    new CoverPage(this).draw(lines);
  }

  heading(text: string, level: 1 | 2 | 3): void {
    const { doc, fonts } = this;
    // título nunca fica sozinho no pé da página: reserva espaço pro começo do bloco seguinte
    this.ensureSpace(level === 1 ? 140 : level === 2 ? 120 : 96);
    doc.moveDown(level === 1 ? 0.6 : 0.9);
    if (level === 1) {
      doc
        .font(fonts.display)
        .fontSize(fonts.brand ? 18 : 22)
        .fillColor(COLORS.night)
        .text(this.safe(text.toUpperCase(), 'display'), { width: this.width });
      energyRule(doc, MARGIN, doc.y + 5, 56, 3);
      doc.moveDown(0.9);
      return;
    }
    doc
      .font(fonts.bold)
      .fontSize(level === 2 ? 14.5 : 11.6)
      .fillColor(level === 2 ? COLORS.indigo : COLORS.electric)
      .text(this.safe(text), { width: this.width });
    doc.moveDown(0.35);
  }

  paragraph(runs: InlineRun[], options: { indent?: number; color?: string } = {}): void {
    this.text.paragraph(runs, options);
  }

  quote(runs: InlineRun[]): void {
    this.text.quote(runs);
  }

  bullet(runs: InlineRun[], marker = '•', depth = 0): void {
    this.text.bullet(runs, marker, depth);
  }

  code(lines: string[]): void {
    new CodeBlock(this).draw(lines);
  }

  chips(items: string[]): void {
    new ChipList(this).draw(items);
  }

  table(header: string[], rows: string[][]): void {
    new TableBlock(this).draw(header, rows);
  }

  ensureSpace(height: number): void {
    if (this.doc.y + height > this.bottom) this.doc.addPage();
  }

  async finish(): Promise<void> {
    new PageChrome(this, this.title).draw();
    this.doc.end();
    await this.done;
  }
}

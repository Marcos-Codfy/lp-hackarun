import PDFDocument from 'pdfkit';
import { createWriteStream } from 'node:fs';
import { COLORS, registerFonts, type FontSet } from './theme.ts';

const MARGIN = 56;

export interface InlineRun {
  text: string;
  bold?: boolean;
  code?: boolean;
}

// fachada fina sobre o pdfkit com os blocos que os documentos usam
export class PdfWriter {
  readonly doc: PDFKit.PDFDocument;
  readonly fonts: FontSet;
  private readonly title: string;
  private readonly done: Promise<void>;

  constructor(outFile: string, meta: { title: string; root: string; date: Date }) {
    this.title = meta.title;
    this.doc = new PDFDocument({
      size: 'A4',
      margins: { top: MARGIN + 10, bottom: MARGIN, left: MARGIN, right: MARGIN },
      bufferPages: true,
      info: { Title: meta.title, Author: 'HackaRun · Unicatólica', CreationDate: meta.date },
    });
    this.fonts = registerFonts(this.doc, meta.root);
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

  cover(lines: { kicker: string; title: string; subtitle: string; meta: string[] }): void {
    const { doc } = this;
    const { width, height } = doc.page;
    doc.rect(0, 0, width, height).fill(COLORS.deep);
    doc
      .circle(width * 0.78, height * 0.3, 190)
      .lineWidth(1)
      .strokeOpacity(0.35)
      .stroke(COLORS.cyan);
    doc
      .circle(width * 0.78, height * 0.3, 150)
      .lineWidth(0.6)
      .strokeOpacity(0.2)
      .stroke(COLORS.royal);
    doc.strokeOpacity(1);
    doc
      .font(this.fonts.mono)
      .fontSize(9)
      .fillColor(COLORS.cyan)
      .text(lines.kicker.toUpperCase(), MARGIN, height * 0.42, {
        characterSpacing: 2,
      });
    doc
      .moveDown(0.6)
      .font(this.fonts.display)
      .fontSize(46)
      .fillColor(COLORS.white)
      .text(lines.title.toUpperCase(), {
        width: this.width,
        lineGap: -6,
      });
    doc
      .moveDown(0.4)
      .font(this.fonts.body)
      .fontSize(13)
      .fillColor('#B9C9E4')
      .text(lines.subtitle, { width: this.width * 0.8 });
    doc.moveDown(2).font(this.fonts.mono).fontSize(9).fillColor(COLORS.amber);
    lines.meta.forEach((m) => doc.text(m, { characterSpacing: 0.5 }));
    doc.addPage();
  }

  heading(text: string, level: 1 | 2 | 3): void {
    const { doc } = this;
    const sizes = { 1: 24, 2: 16, 3: 12.5 } as const;
    this.ensureSpace(level === 1 ? 90 : 60);
    doc.moveDown(level === 1 ? 0.6 : 0.8);
    if (level === 1) {
      doc
        .font(this.fonts.display)
        .fontSize(sizes[1])
        .fillColor(COLORS.deep)
        .text(text.toUpperCase(), { width: this.width });
      const y = doc.y + 4;
      doc
        .moveTo(MARGIN, y)
        .lineTo(MARGIN + 48, y)
        .lineWidth(3)
        .stroke(COLORS.cyan);
      doc.moveDown(0.8);
      return;
    }
    const font = level === 2 ? this.fonts.bold : this.fonts.bold;
    doc
      .font(font)
      .fontSize(sizes[level])
      .fillColor(level === 2 ? COLORS.deep : COLORS.royal)
      .text(text, { width: this.width });
    doc.moveDown(0.3);
  }

  paragraph(runs: InlineRun[], options: { indent?: number; color?: string } = {}): void {
    const { doc } = this;
    doc.fillColor(options.color ?? COLORS.ink).fontSize(10.5);
    runs.forEach((run, i) => {
      const last = i === runs.length - 1;
      doc.font(run.code ? this.fonts.mono : run.bold ? this.fonts.bold : this.fonts.body);
      doc.fontSize(run.code ? 9.5 : 10.5).text(run.text, {
        continued: !last,
        width: this.width - (options.indent ?? 0),
        indent: i === 0 ? (options.indent ?? 0) : 0,
        lineGap: 3,
      });
    });
    doc.moveDown(0.5);
  }

  bullet(runs: InlineRun[], marker = '•', depth = 0): void {
    const { doc } = this;
    const x = MARGIN + depth * 14;
    this.ensureSpace(24);
    const y = doc.y;
    doc.font(this.fonts.bold).fontSize(10.5).fillColor(COLORS.cyan).text(marker, x, y, { width: 14 });
    doc.x = x + 16;
    doc.y = y;
    runs.forEach((run, i) => {
      doc.font(run.code ? this.fonts.mono : run.bold ? this.fonts.bold : this.fonts.body);
      doc
        .fillColor(COLORS.ink)
        .fontSize(run.code ? 9.5 : 10.5)
        .text(run.text, {
          continued: i < runs.length - 1,
          width: this.width - (x - MARGIN) - 16,
          lineGap: 2.5,
        });
    });
    doc.x = MARGIN;
    doc.moveDown(0.25);
  }

  code(lines: string[]): void {
    const { doc } = this;
    const lineHeight = 12.5;
    const height = lines.length * lineHeight + 16;
    this.ensureSpace(Math.min(height, 300));
    const top = doc.y;
    doc.rect(MARGIN, top, this.width, height).fill(COLORS.deep);
    doc.font(this.fonts.mono).fontSize(8.6).fillColor('#CFE9FF');
    lines.forEach((line, i) =>
      doc.text(line || ' ', MARGIN + 10, top + 8 + i * lineHeight, {
        width: this.width - 20,
        lineBreak: false,
      }),
    );
    doc.x = MARGIN;
    doc.y = top + height + 8;
  }

  // lista de nomes em "chips", usado no PDF de stack
  chips(items: string[]): void {
    const { doc } = this;
    const padX = 8;
    const h = 20;
    const gap = 6;
    doc.font(this.fonts.body).fontSize(9.2);
    let x = MARGIN;
    this.ensureSpace(h + gap);
    let y = doc.y;
    for (const item of items) {
      const w = Math.min(doc.widthOfString(item) + padX * 2 + 2, this.width);
      if (x + w > MARGIN + this.width) {
        x = MARGIN;
        y += h + gap;
        if (y + h > doc.page.height - MARGIN) {
          doc.addPage();
          y = doc.y;
        }
      }
      doc.roundedRect(x, y, w, h, 3).fill(COLORS.chip);
      doc.rect(x, y, 2, h).fill(COLORS.cyan);
      doc.fillColor(COLORS.ink).text(item, x + padX, y + 5.5, { lineBreak: false });
      x += w + gap;
    }
    doc.x = MARGIN;
    doc.y = y + h + 14;
  }

  table(header: string[], rows: string[][]): void {
    const { doc } = this;
    const colW = this.width / header.length;
    const drawRow = (cells: string[], bold: boolean, fill?: string) => {
      doc.font(bold ? this.fonts.bold : this.fonts.body).fontSize(9);
      const heights = cells.map((c) => doc.heightOfString(c, { width: colW - 10 }));
      const h = Math.max(...heights) + 10;
      this.ensureSpace(h);
      const y = doc.y;
      if (fill) doc.rect(MARGIN, y, this.width, h).fill(fill);
      cells.forEach((c, i) =>
        doc
          .fillColor(bold ? COLORS.white : COLORS.ink)
          .text(c, MARGIN + i * colW + 5, y + 5, { width: colW - 10 }),
      );
      doc
        .moveTo(MARGIN, y + h)
        .lineTo(MARGIN + this.width, y + h)
        .lineWidth(0.5)
        .stroke(COLORS.line);
      doc.x = MARGIN;
      doc.y = y + h;
    };
    drawRow(header, true, COLORS.deep);
    rows.forEach((r) => drawRow(r, false));
    doc.moveDown(0.8);
  }

  ensureSpace(height: number): void {
    if (this.doc.y + height > this.doc.page.height - MARGIN) this.doc.addPage();
  }

  async finish(): Promise<void> {
    const { doc } = this;
    const range = doc.bufferedPageRange();
    // cabeçalho e rodapé em todas as páginas, menos a capa
    for (let i = range.start + 1; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      const bottom = doc.page.height - 34;
      doc.font(this.fonts.mono).fontSize(7.5).fillColor(COLORS.muted);
      doc.text(this.title.toUpperCase(), MARGIN, 30, {
        width: this.width,
        characterSpacing: 1,
        lineBreak: false,
      });
      doc.text(`${i} / ${range.count - 1}`, MARGIN, bottom, {
        width: this.width,
        align: 'right',
        lineBreak: false,
      });
      doc
        .moveTo(MARGIN, 44)
        .lineTo(MARGIN + this.width, 44)
        .lineWidth(0.5)
        .stroke(COLORS.line);
    }
    doc.end();
    await this.done;
  }
}

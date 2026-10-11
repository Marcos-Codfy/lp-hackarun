import { MARGIN, type PdfContext } from '../context.ts';
import { COLORS, MONO_FEATURES } from '../theme.ts';

export interface InlineRun {
  text: string;
  bold?: boolean;
  code?: boolean;
}

const TEXT_SIZE = 10.2;
const CODE_SIZE = 9.2;
const QUOTE_INDENT = 14;
const CHECKBOXES = new Set(['[ ]', '[x]']);

// blocos de texto corrido: parágrafo, citação e item de lista (com negrito e código no meio da linha)
export class TextBlocks {
  private readonly ctx: PdfContext;

  constructor(ctx: PdfContext) {
    this.ctx = ctx;
  }

  paragraph(runs: InlineRun[], options: { indent?: number; color?: string } = {}): void {
    const indent = options.indent ?? 0;
    this.runs(runs, {
      x: MARGIN + indent,
      width: this.ctx.width - indent,
      color: options.color ?? COLORS.ink,
    });
    this.ctx.doc.moveDown(0.5);
  }

  // citação: barra lateral ciano + texto apagado
  quote(runs: InlineRun[]): void {
    const { doc, fonts } = this.ctx;
    const width = this.ctx.width - QUOTE_INDENT;
    const plain = runs.map((r) => this.ctx.safe(r.text)).join('');
    doc.font(fonts.body).fontSize(TEXT_SIZE);
    this.ctx.ensureSpace(Math.min(doc.heightOfString(plain, { width, lineGap: 3 }), 120) + 8);
    const top = doc.y;
    this.runs(runs, { x: MARGIN + QUOTE_INDENT, width, color: COLORS.muted });
    doc.rect(MARGIN, top - 2, 2.5, doc.y - top + 2).fill(COLORS.cyan);
    doc.moveDown(0.6);
  }

  // marcador "•", "1." ou caixa de checklist ("[ ]" / "[x]")
  bullet(runs: InlineRun[], marker: string, depth: number): void {
    const { doc, fonts } = this.ctx;
    const x = MARGIN + depth * 14;
    this.ctx.ensureSpace(24);
    const y = doc.y;
    if (CHECKBOXES.has(marker)) this.checkbox(x, y + 2, marker === '[x]');
    else
      doc.font(fonts.bold).fontSize(TEXT_SIZE).fillColor(COLORS.electric).text(marker, x, y, { width: 16 });
    this.runs(runs, { x: x + 18, y, width: this.ctx.width - (x - MARGIN) - 18, color: COLORS.ink });
    doc.moveDown(0.25);
  }

  // trechos encadeados (continued); x/y só valem pra primeira linha
  private runs(runs: InlineRun[], at: { x: number; y?: number; width: number; color: string }): void {
    const { doc, fonts } = this.ctx;
    runs.forEach((run, i) => {
      const options = {
        continued: i < runs.length - 1,
        width: at.width,
        lineGap: 3,
        ...(run.code ? { features: MONO_FEATURES } : {}),
      };
      doc
        .font(run.code ? fonts.mono : run.bold ? fonts.bold : fonts.body)
        .fontSize(run.code ? CODE_SIZE : TEXT_SIZE)
        .fillColor(run.code ? COLORS.electric : at.color);
      const text = this.ctx.safe(run.text);
      if (i === 0) doc.text(text, at.x, at.y ?? doc.y, options);
      else doc.text(text, options);
    });
    doc.x = MARGIN;
  }

  private checkbox(x: number, y: number, done: boolean): void {
    const { doc } = this.ctx;
    doc.roundedRect(x, y, 9, 9, 1.5).lineWidth(0.9).stroke(COLORS.electric);
    if (done) doc.roundedRect(x + 2, y + 2, 5, 5, 1).fill(COLORS.electric);
  }
}

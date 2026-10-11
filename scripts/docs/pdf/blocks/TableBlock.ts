import { MARGIN, type PdfContext } from '../context.ts';
import { COLORS } from '../theme.ts';

const PAD = 5;
const FONT_SIZE = 8.8;
// nenhuma coluna fica estreita demais pra uma palavra média
const MIN_SHARE = 0.14;

// tabela com colunas proporcionais ao conteúdo; o cabeçalho se repete quando a tabela vira a página
export class TableBlock {
  private readonly ctx: PdfContext;

  constructor(ctx: PdfContext) {
    this.ctx = ctx;
  }

  draw(header: string[], rows: string[][]): void {
    const safeHeader = header.map((c) => this.ctx.safe(c));
    const safeRows = rows.map((r) => r.map((c) => this.ctx.safe(c)));
    const widths = this.columnWidths(safeHeader, safeRows);
    this.row(safeHeader, widths, true);
    for (const cells of safeRows) {
      if (this.ctx.doc.y + this.heightOf(cells, widths, false) > this.ctx.bottom) {
        this.ctx.doc.addPage();
        this.row(safeHeader, widths, true);
      }
      this.row(cells, widths, false);
    }
    this.ctx.doc.moveDown(0.8);
  }

  // peso por coluna = maior célula (limitada), com piso; texto curto não ganha metade da página.
  // a coluna nunca fica mais estreita que a maior palavra dela (nada de "Hospedage/m")
  private columnWidths(header: string[], rows: string[][]): number[] {
    const columns = header.map((h, i) => [h, ...rows.map((r) => r[i] ?? '')]);
    const weights = columns.map((cells) => Math.min(Math.max(...cells.map((c) => c.length)), 60) + 6);
    const total = weights.reduce((a, b) => a + b, 0);
    const shares = weights.map((w) => Math.max(MIN_SHARE, w / total));
    const sum = shares.reduce((a, b) => a + b, 0);
    const widths = shares.map((s) => (s / sum) * this.ctx.width);
    const floors = columns.map((cells) => this.longestWord(cells) + PAD * 2 + 2);
    // tira de quem sobra o que falta pra quem ficou abaixo do piso
    const deficit = widths.reduce((acc, w, i) => acc + Math.max(0, (floors[i] ?? 0) - w), 0);
    const spare = widths.reduce((acc, w, i) => acc + Math.max(0, w - (floors[i] ?? 0)), 0);
    if (deficit <= 0 || spare <= deficit) return widths;
    return widths.map((w, i) => {
      const floor = floors[i] ?? 0;
      return w < floor ? floor : w - ((w - floor) / spare) * deficit;
    });
  }

  private longestWord(cells: string[]): number {
    const { doc, fonts } = this.ctx;
    let max = 0;
    cells.forEach((cell, row) => {
      doc.font(row === 0 ? fonts.bold : fonts.body).fontSize(FONT_SIZE);
      for (const word of cell.split(/\s+/)) max = Math.max(max, doc.widthOfString(word));
    });
    return max;
  }

  private heightOf(cells: string[], widths: number[], bold: boolean): number {
    const { doc, fonts } = this.ctx;
    doc.font(bold ? fonts.bold : fonts.body).fontSize(FONT_SIZE);
    const heights = cells.map((c, i) =>
      doc.heightOfString(c, { width: (widths[i] ?? 0) - PAD * 2, lineGap: 1 }),
    );
    return Math.max(...heights) + PAD * 2;
  }

  private row(cells: string[], widths: number[], bold: boolean): void {
    const { doc, fonts } = this.ctx;
    const h = this.heightOf(cells, widths, bold);
    if (bold) this.ctx.ensureSpace(h * 2);
    const y = doc.y;
    if (bold) doc.rect(MARGIN, y, this.ctx.width, h).fill(COLORS.night);
    let x = MARGIN;
    cells.forEach((c, i) => {
      const w = widths[i] ?? 0;
      doc
        .font(bold ? fonts.bold : fonts.body)
        .fontSize(FONT_SIZE)
        .fillColor(bold ? COLORS.ice : COLORS.ink)
        .text(c, x + PAD, y + PAD, { width: w - PAD * 2, lineGap: 1 });
      x += w;
    });
    doc
      .moveTo(MARGIN, y + h)
      .lineTo(MARGIN + this.ctx.width, y + h)
      .lineWidth(0.5)
      .stroke(COLORS.line);
    doc.x = MARGIN;
    doc.y = y + h;
  }
}

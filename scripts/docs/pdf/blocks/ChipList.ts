import { MARGIN, type PdfContext } from '../context.ts';
import { COLORS } from '../theme.ts';

const PAD_X = 8;
const HEIGHT = 20;
const GAP = 6;

// lista de nomes em "chips" (PDF de stack): quebra a linha e a página sozinha
export class ChipList {
  private readonly ctx: PdfContext;

  constructor(ctx: PdfContext) {
    this.ctx = ctx;
  }

  draw(items: string[]): void {
    const { doc, fonts } = this.ctx;
    doc.font(fonts.body).fontSize(8.8);
    this.ctx.ensureSpace(HEIGHT + GAP);
    let x = MARGIN;
    let y = doc.y;
    for (const raw of items) {
      const item = this.ctx.safe(raw);
      const w = Math.min(doc.widthOfString(item) + PAD_X * 2 + 2, this.ctx.width);
      if (x + w > MARGIN + this.ctx.width) {
        x = MARGIN;
        y += HEIGHT + GAP;
      }
      if (y + HEIGHT > this.ctx.bottom) {
        doc.addPage();
        x = MARGIN;
        y = doc.y;
      }
      doc.roundedRect(x, y, w, HEIGHT, 3).fill(COLORS.chip);
      doc.rect(x, y, 2, HEIGHT).fill(COLORS.electric);
      doc.fillColor(COLORS.ink).text(item, x + PAD_X, y + 6, { lineBreak: false });
      x += w + GAP;
    }
    doc.x = MARGIN;
    doc.y = y + HEIGHT + 14;
  }
}

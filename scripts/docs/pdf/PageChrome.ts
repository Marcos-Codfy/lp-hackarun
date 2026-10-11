import { MARGIN, type PdfContext } from './context.ts';
import { energyRule } from './decor.ts';
import { COLORS, MONO_FEATURES } from './theme.ts';

// cabeçalho (título + fio de energia) e numeração em todas as páginas, menos a capa
export class PageChrome {
  private readonly ctx: PdfContext;
  private readonly title: string;

  constructor(ctx: PdfContext, title: string) {
    this.ctx = ctx;
    this.title = title;
  }

  draw(): void {
    const { doc } = this.ctx;
    const range = doc.bufferedPageRange();
    for (let i = range.start + 1; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      // o rodapé fica abaixo da margem: sem zerar, o pdfkit abre uma página em branco a cada número
      const margin = doc.page.margins.bottom;
      doc.page.margins.bottom = 0;
      this.page(i, range.count - 1);
      doc.page.margins.bottom = margin;
    }
  }

  private page(index: number, total: number): void {
    const { doc, fonts, width } = this.ctx;
    const options = { width, lineBreak: false, features: MONO_FEATURES };
    doc.font(fonts.mono).fontSize(7.2).fillColor(COLORS.muted);
    doc.text(this.ctx.safe(this.title.toUpperCase()), MARGIN, 30, { ...options, characterSpacing: 1 });
    doc.text(`${index} / ${total}`, MARGIN, doc.page.height - 34, { ...options, align: 'right' });
    energyRule(doc, MARGIN, 44, width, 0.8);
  }
}

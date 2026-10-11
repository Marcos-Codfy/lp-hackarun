import { MARGIN, type PdfContext } from '../context.ts';
import { COLORS, MONO_FEATURES } from '../theme.ts';

const PAD = 9;
const MAX_SIZE = 8.6;
const MIN_SIZE = 7;
// as duas monoespaçadas (JetBrains Mono e Courier) têm avanço de 0,6 em
const ADVANCE = 0.6;
const LEADING = 1.42;

// bloco de código: diminui a fonte pra caber a linha mais longa, quebra o que ainda sobrar
// e continua na página seguinte em vez de vazar pelo rodapé
export class CodeBlock {
  private readonly ctx: PdfContext;

  constructor(ctx: PdfContext) {
    this.ctx = ctx;
  }

  draw(source: string[]): void {
    const inner = this.ctx.width - PAD * 2;
    const safe = source.map((l) => this.ctx.safe(l));
    const longest = Math.max(1, ...safe.map((l) => l.length));
    const size = Math.max(MIN_SIZE, Math.min(MAX_SIZE, inner / (longest * ADVANCE)));
    const lines = this.wrap(safe, Math.floor(inner / (size * ADVANCE)));
    const lineHeight = size * LEADING;

    let index = 0;
    this.ctx.ensureSpace(Math.min(lines.length, 4) * lineHeight + PAD * 2);
    while (index < lines.length) {
      const room = Math.floor((this.ctx.bottom - this.ctx.doc.y - PAD * 2) / lineHeight);
      if (room < 2) {
        this.ctx.doc.addPage();
        continue;
      }
      const chunk = lines.slice(index, index + room);
      this.panel(chunk, size, lineHeight);
      index += chunk.length;
    }
    this.ctx.doc.x = MARGIN;
  }

  private wrap(lines: string[], max: number): string[] {
    return lines.flatMap((line) => {
      if (line.length <= max) return [line];
      const indent = ' '.repeat(Math.min(6, line.length - line.trimStart().length + 2));
      const parts = [line.slice(0, max)];
      for (let rest = line.slice(max); rest.length > 0; rest = rest.slice(max - indent.length)) {
        parts.push(indent + rest.slice(0, max - indent.length));
      }
      return parts;
    });
  }

  private panel(lines: string[], size: number, lineHeight: number): void {
    const { doc, fonts } = this.ctx;
    const top = doc.y;
    const height = lines.length * lineHeight + PAD * 2;
    doc.rect(MARGIN, top, this.ctx.width, height).fill(COLORS.night);
    doc.rect(MARGIN, top, 2, height).fill(COLORS.cyan);
    doc.font(fonts.mono).fontSize(size).fillColor(COLORS.codeText);
    lines.forEach((line, i) =>
      doc.text(line || ' ', MARGIN + PAD, top + PAD + i * lineHeight, {
        lineBreak: false,
        features: MONO_FEATURES,
      }),
    );
    doc.y = top + height + 10;
  }
}

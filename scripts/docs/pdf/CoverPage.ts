import { existsSync } from 'node:fs';
import { MARGIN, type PdfContext } from './context.ts';
import { energyRule } from './decor.ts';
import { assetPath, BRAND_IMAGES, COLORS, MONO_FEATURES } from './theme.ts';

export interface CoverLines {
  kicker: string;
  title: string;
  subtitle: string;
  meta: string[];
}

// capa no clima do site: vazio quase preto, aurora azul/violeta, anéis do globo, logo e parceiros oficiais
export class CoverPage {
  private readonly ctx: PdfContext;

  constructor(ctx: PdfContext) {
    this.ctx = ctx;
  }

  draw(lines: CoverLines): void {
    const { doc } = this.ctx;
    const { width, height } = doc.page;
    this.background(width, height);
    this.rings(width * 0.84, height * 0.36);
    this.image(BRAND_IMAGES.logo, MARGIN - 6, 96, { width: 290 });
    this.texts(lines, height);
    this.partners(height);
    doc.addPage();
  }

  private background(width: number, height: number): void {
    const { doc } = this.ctx;
    doc.rect(0, 0, width, height).fill(COLORS.void);
    // manchas da aurora: degradê radial que some na borda (como os blobs do BaseLayout)
    const blob = (x: number, y: number, r: number, color: string, alpha: number) => {
      const gradient = doc.radialGradient(x, y, 0, x, y, r);
      gradient.stop(0, color, alpha).stop(1, color, 0);
      doc.circle(x, y, r).fill(gradient);
    };
    blob(width * 0.5, -height * 0.05, height * 0.55, COLORS.electric, 0.42);
    blob(width * 1.05, height * 0.82, height * 0.45, COLORS.violet, 0.3);
    blob(-width * 0.1, height * 0.95, height * 0.4, COLORS.cyan, 0.12);
  }

  private rings(cx: number, cy: number): void {
    const { doc } = this.ctx;
    const rings: [number, string, number, number][] = [
      [210, COLORS.cyan, 0.32, 1],
      [168, COLORS.electric, 0.28, 0.7],
      [124, COLORS.violet, 0.2, 0.6],
    ];
    for (const [r, color, alpha, line] of rings) {
      doc.circle(cx, cy, r).lineWidth(line).strokeOpacity(alpha).stroke(color);
    }
    doc.strokeOpacity(1);
  }

  private texts(lines: CoverLines, height: number): void {
    const { doc, fonts, width } = this.ctx;
    doc
      .font(fonts.mono)
      .fontSize(9)
      .fillColor(COLORS.cyan)
      .text(this.ctx.safe(lines.kicker.toUpperCase()), MARGIN, height * 0.42, {
        characterSpacing: 2,
        features: MONO_FEATURES,
      });
    doc
      .moveDown(0.7)
      .font(fonts.display)
      .fontSize(fonts.brand ? 34 : 44)
      .fillColor(COLORS.ice)
      .text(this.ctx.safe(lines.title.toUpperCase(), 'display'), { width, lineGap: 2 });
    energyRule(doc, MARGIN, doc.y + 10, 150, 3);
    doc
      .font(fonts.body)
      .fontSize(12.5)
      .fillColor(COLORS.coverText)
      .text(this.ctx.safe(lines.subtitle), MARGIN, doc.y + 26, { width: width * 0.8, lineGap: 3 });
    doc.moveDown(2).font(fonts.mono).fontSize(8.5).fillColor(COLORS.gold);
    lines.meta.forEach((m) => doc.text(this.ctx.safe(m), { characterSpacing: 0.5, features: MONO_FEATURES }));
  }

  private partners(height: number): void {
    const { doc, fonts } = this.ctx;
    const top = height - 128;
    doc
      .moveTo(MARGIN, top - 18)
      .lineTo(MARGIN + this.ctx.width, top - 18)
      .lineWidth(0.5)
      .strokeOpacity(0.25)
      .stroke(COLORS.ice);
    doc.strokeOpacity(1);
    const label = (text: string, x: number) =>
      doc
        .font(fonts.mono)
        .fontSize(7)
        .fillColor(COLORS.coverText)
        .text(text, x, top, { characterSpacing: 1.6, lineBreak: false, features: MONO_FEATURES });
    label('REALIZAÇÃO', MARGIN);
    this.image(BRAND_IMAGES.organizer, MARGIN, top + 16, { height: 46 });
    label('PARCERIA', MARGIN + 150);
    this.image(BRAND_IMAGES.partner, MARGIN + 150, top + 18, { height: 42 });
  }

  // logo ausente não quebra a capa (os assets são gerados por build_pdf_assets.py)
  private image(file: string, x: number, y: number, size: { width?: number; height?: number }): void {
    const path = assetPath(this.ctx.root, file);
    if (existsSync(path)) this.ctx.doc.image(path, x, y, size);
  }
}

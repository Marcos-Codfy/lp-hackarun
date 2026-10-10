import type { Bolt, BoltStroke, Tint } from './types';

interface Palette {
  glow: string;
  mid: string;
  core: string;
}

// azul elétrico + ciano + quase branco; violeta raro pra puxar a paleta de mistério
const PALETTES: Record<Tint, Palette> = {
  blue: { glow: '18, 100, 255', mid: '0, 229, 255', core: '245, 250, 255' },
  violet: { glow: '148, 27, 255', mid: '196, 120, 255', core: '252, 240, 255' },
};

// pinta os raios em 3 passadas (halo largo, miolo ciano, núcleo branco) com 'lighter'
export class BoltPainter {
  constructor(
    private readonly ctx: CanvasRenderingContext2D,
    // lite: sem shadowBlur na passada do meio (celular)
    private readonly lite: boolean,
  ) {}

  clear(width: number, height: number): void {
    const { ctx } = this;
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.clearRect(0, 0, width, height);
  }

  paint(bolt: Bolt, alpha: number, scale: number, useRestrike: boolean): void {
    if (alpha <= 0.01) return;
    const { ctx } = this;
    const palette = PALETTES[bolt.tint];
    const strokes = useRestrike && bolt.restrike ? bolt.restrike : bolt.strokes;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    if (bolt.origin) this.flash(bolt.origin.x, bolt.origin.y, alpha, scale, palette);
    for (const stroke of strokes) this.strokeBranch(stroke, alpha, scale, palette);
  }

  private strokeBranch(stroke: BoltStroke, alpha: number, scale: number, palette: Palette): void {
    const { ctx } = this;
    const w = stroke.width * scale;

    ctx.shadowColor = `rgba(${palette.glow}, ${alpha})`;
    ctx.shadowBlur = 22 * scale;
    ctx.strokeStyle = `rgba(${palette.glow}, ${0.4 * alpha})`;
    ctx.lineWidth = 6 * w;
    ctx.stroke(stroke.path);

    ctx.shadowBlur = this.lite ? 0 : 7 * scale;
    ctx.shadowColor = `rgba(${palette.mid}, ${alpha})`;
    ctx.strokeStyle = `rgba(${palette.mid}, ${0.9 * alpha})`;
    ctx.lineWidth = 2.4 * w;
    ctx.stroke(stroke.path);

    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(${palette.core}, ${alpha})`;
    ctx.lineWidth = 1.1 * w;
    ctx.stroke(stroke.path);
  }

  // clarão no ponto de impacto
  private flash(x: number, y: number, alpha: number, scale: number, palette: Palette): void {
    const { ctx } = this;
    const radius = 34 * scale;
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, `rgba(${palette.core}, ${0.55 * alpha})`);
    gradient.addColorStop(0.25, `rgba(${palette.mid}, ${0.28 * alpha})`);
    gradient.addColorStop(1, `rgba(${palette.glow}, 0)`);
    ctx.shadowBlur = 0;
    ctx.fillStyle = gradient;
    ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  }
}

import type { ContourPoint } from './types';

const ALPHA_EDGE = 110;
const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// lê o alfa do PNG do logo e devolve só a silhueta externa (buracos das letras ficam de fora),
// com a normal apontando pra fora: é de onde os raios nascem
export class LogoContour {
  static sample(img: HTMLImageElement, sampleWidth = 300): ContourPoint[] {
    const width = sampleWidth;
    const height = Math.max(1, Math.round((sampleWidth * img.naturalHeight) / (img.naturalWidth || 1)));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, width, height);
    const alpha = LogoContour.alphaOf(ctx.getImageData(0, 0, width, height).data);
    return new LogoContour(alpha, width, height).collect();
  }

  private static alphaOf(rgba: Uint8ClampedArray): Uint8Array {
    const out = new Uint8Array(rgba.length / 4);
    for (let i = 0; i < out.length; i++) out[i] = rgba[i * 4 + 3] ?? 0;
    return out;
  }

  private readonly outside: Uint8Array;

  private constructor(
    private readonly alpha: Uint8Array,
    private readonly width: number,
    private readonly height: number,
  ) {
    this.outside = this.floodOutside();
  }

  private collect(): ContourPoint[] {
    const points: ContourPoint[] = [];
    for (let y = 1; y < this.height - 1; y++) {
      for (let x = 1; x < this.width - 1; x++) {
        if (this.a(x, y) < ALPHA_EDGE || !this.touchesOutside(x, y)) continue;
        const gx = this.a(x + 1, y) - this.a(x - 1, y);
        const gy = this.a(x, y + 1) - this.a(x, y - 1);
        const length = Math.hypot(gx, gy);
        if (length === 0) continue;
        points.push({ x: x / this.width, y: y / this.height, nx: -gx / length, ny: -gy / length });
      }
    }
    return points;
  }

  // BFS a partir das bordas da imagem: tudo transparente alcançável é "fora"
  private floodOutside(): Uint8Array {
    const { width, height } = this;
    const seen = new Uint8Array(width * height);
    const queue: number[] = [];
    const push = (x: number, y: number) => {
      const i = y * width + x;
      if (seen[i] || (this.alpha[i] ?? 0) >= ALPHA_EDGE) return;
      seen[i] = 1;
      queue.push(i);
    };
    for (let x = 0; x < width; x++) {
      push(x, 0);
      push(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      push(0, y);
      push(width - 1, y);
    }
    for (let head = 0; head < queue.length; head++) {
      const i = queue[head] ?? 0;
      const x = i % width;
      const y = (i - x) / width;
      for (const [dx, dy] of NEIGHBORS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && ny >= 0 && nx < width && ny < height) push(nx, ny);
      }
    }
    return seen;
  }

  private touchesOutside(x: number, y: number): boolean {
    return NEIGHBORS.some(([dx, dy]) => this.outside[(y + dy) * this.width + (x + dx)] === 1);
  }

  private a(x: number, y: number): number {
    return this.alpha[y * this.width + x] ?? 0;
  }
}

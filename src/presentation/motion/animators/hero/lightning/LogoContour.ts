import type { ContourPoint } from './types';

const ALPHA_EDGE = 110;
const NEIGHBORS = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

// a partir do RGBA do logo devolve só a silhueta externa (buracos das letras ficam de fora),
// com a normal apontando pra fora: é de onde os raios nascem. Sem DOM: roda no worker e na thread principal
export class LogoContour {
  static fromRgba(rgba: Uint8ClampedArray, width: number, height: number): ContourPoint[] {
    return new LogoContour(LogoContour.alphaOf(rgba), width, height).collect();
  }

  // 4 floats por ponto (x, y, nx, ny): atravessa o postMessage por transferência
  static flatten(points: readonly ContourPoint[]): Float32Array {
    const out = new Float32Array(points.length * 4);
    points.forEach((p, i) => out.set([p.x, p.y, p.nx, p.ny], i * 4));
    return out;
  }

  static unflatten(flat: Float32Array): ContourPoint[] {
    const points: ContourPoint[] = [];
    for (let i = 0; i + 3 < flat.length; i += 4) {
      points.push({ x: flat[i] ?? 0, y: flat[i + 1] ?? 0, nx: flat[i + 2] ?? 0, ny: flat[i + 3] ?? 0 });
    }
    return points;
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

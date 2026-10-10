import type { Vec3 } from './sampling';

// caminho de segmentos amostrado por comprimento de arco (raio, contornos, alças)
export class PolylinePath {
  private readonly lengths: Float32Array;
  readonly length: number;

  constructor(private readonly points: readonly Vec3[]) {
    this.lengths = new Float32Array(points.length);
    let total = 0;
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1];
      const b = points[i];
      if (a && b) total += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      this.lengths[i] = total;
    }
    this.length = total;
  }

  // u em 0..1 ao longo do caminho todo
  sample(u: number, out: Vec3): Vec3 {
    const target = Math.min(Math.max(u, 0), 1) * this.length;
    let lo = 1;
    let hi = this.points.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if ((this.lengths[mid] ?? 0) < target) lo = mid + 1;
      else hi = mid;
    }
    const a = this.points[lo - 1];
    const b = this.points[lo];
    if (!a || !b) return out;
    const start = this.lengths[lo - 1] ?? 0;
    const span = (this.lengths[lo] ?? 0) - start || 1;
    const t = (target - start) / span;
    out.x = a.x + (b.x - a.x) * t;
    out.y = a.y + (b.y - a.y) * t;
    out.z = a.z + (b.z - a.z) * t;
    return out;
  }
}

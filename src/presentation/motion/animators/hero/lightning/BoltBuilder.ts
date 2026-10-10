import { chance, rand, type BoltStroke, type Vec } from './types';

export interface BranchOptions {
  // deslocamento máximo do ponto médio, em fração do comprimento (0.2 = bem torto)
  roughness: number;
  // quantos galhos saem do tronco
  forks: number;
  // menor segmento em px: abaixo disso para de subdividir
  minSegment: number;
  width: number;
  // galhos dos galhos (1 = um nível)
  depth?: number;
}

// gera a geometria do raio: deslocamento recursivo do ponto médio + bifurcações
export class BoltBuilder {
  build(from: Vec, to: Vec, options: BranchOptions): BoltStroke[] {
    const trunk = this.polyline(from, to, options.roughness, options.minSegment);
    const strokes: BoltStroke[] = [{ path: this.toPath(trunk), width: options.width }];
    this.fork(trunk, options, options.depth ?? 1, strokes);
    return strokes;
  }

  // raio que sai de A, estufa pra fora (bulge) e volta pra B: eletricidade "andando" pela borda
  arc(from: Vec, to: Vec, bulge: Vec, options: BranchOptions): BoltStroke[] {
    const mid = { x: (from.x + to.x) / 2 + bulge.x, y: (from.y + to.y) / 2 + bulge.y };
    const first = this.polyline(from, mid, options.roughness, options.minSegment);
    const second = this.polyline(mid, to, options.roughness, options.minSegment);
    const trunk = [...first, ...second.slice(1)];
    const strokes: BoltStroke[] = [{ path: this.toPath(trunk), width: options.width }];
    this.fork(trunk, options, 0, strokes);
    return strokes;
  }

  polyline(from: Vec, to: Vec, roughness: number, minSegment: number): Vec[] {
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    const out: Vec[] = [from];
    this.displace(from, to, length * roughness, minSegment, out);
    return out;
  }

  private displace(a: Vec, b: Vec, offset: number, minSegment: number, out: Vec[]): void {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy);
    if (length < minSegment || length === 0) {
      out.push(b);
      return;
    }
    // empurra o meio na perpendicular; o deslocamento cai pela metade a cada nível
    const shift = (Math.random() * 2 - 1) * offset;
    const mid = { x: (a.x + b.x) / 2 - (dy / length) * shift, y: (a.y + b.y) / 2 + (dx / length) * shift };
    this.displace(a, mid, offset / 2, minSegment, out);
    this.displace(mid, b, offset / 2, minSegment, out);
  }

  private fork(trunk: Vec[], options: BranchOptions, depth: number, strokes: BoltStroke[]): void {
    const last = trunk.at(-1);
    const first = trunk[0];
    if (!last || !first || trunk.length < 6) return;
    const total = Math.hypot(last.x - first.x, last.y - first.y);

    for (let i = 0; i < options.forks; i++) {
      const index = Math.floor(rand(0.15, 0.7) * (trunk.length - 1));
      const start = trunk[index];
      const next = trunk[Math.min(index + 2, trunk.length - 1)];
      if (!start || !next) continue;
      const base = Math.atan2(next.y - start.y, next.x - start.x);
      const angle = base + (chance(0.5) ? 1 : -1) * rand(0.35, 0.85);
      const length = total * rand(0.22, 0.5);
      const end = { x: start.x + Math.cos(angle) * length, y: start.y + Math.sin(angle) * length };
      const branch = this.polyline(start, end, options.roughness * 0.9, options.minSegment);
      strokes.push({ path: this.toPath(branch), width: options.width * 0.5 });
      if (depth > 0 && chance(0.5)) {
        this.fork(branch, { ...options, forks: 1, width: options.width * 0.6 }, depth - 1, strokes);
      }
    }
  }

  private toPath(points: Vec[]): Path2D {
    const path = new Path2D();
    points.forEach((p, i) => (i === 0 ? path.moveTo(p.x, p.y) : path.lineTo(p.x, p.y)));
    return path;
  }
}

import type { PolylinePath } from './PolylinePath';
import { PointWriter, TAU, gaussian, vec3, type Random, type Vec3 } from './sampling';

// base ortonormal de um plano: círculos e arcos são desenhados em (u, v)
export interface Plane {
  readonly u: Vec3;
  readonly v: Vec3;
}

export const PLANE_XY: Plane = { u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 1, z: 0 } };
export const PLANE_XZ: Plane = { u: { x: 1, y: 0, z: 0 }, v: { x: 0, y: 0, z: 1 } };

export const at = (x: number, y: number, z = 0): Vec3 => ({ x, y, z });

// Builder de traços finos: amostragem estratificada (passo regular + jitter) deixa a linha contínua, sem falhas
export class PointBrush {
  private readonly writer: PointWriter;
  private readonly cursor = vec3();

  constructor(
    count: number,
    readonly random: Random,
  ) {
    this.writer = new PointWriter(count);
  }

  // blur = desvio gaussiano: 0 é traço cravado, ~0.01 já vira halo
  dot(x: number, y: number, z: number, blur = 0): void {
    if (blur <= 0) return this.writer.push(x, y, z);
    // Box-Muller em par: duas normais por sorteio (gerar 42k pontos x 8 formas pesa no celular)
    const r = this.random;
    const m = Math.sqrt(-2 * Math.log(1 - r())) * blur;
    const a = TAU * r();
    this.writer.push(x + Math.cos(a) * m, y + Math.sin(a) * m, z + gaussian(r) * blur);
  }

  segment(a: Vec3, b: Vec3, n: number, blur = 0): void {
    for (let i = 0; i < n; i++) {
      const t = (i + this.random()) / n;
      this.dot(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t, blur);
    }
  }

  arc(c: Vec3, radius: number, plane: Plane, n: number, from = 0, to = TAU, blur = 0): void {
    const { u, v } = plane;
    for (let i = 0; i < n; i++) {
      const a = from + ((to - from) * (i + this.random())) / n;
      const cos = Math.cos(a) * radius;
      const sin = Math.sin(a) * radius;
      this.dot(c.x + u.x * cos + v.x * sin, c.y + u.y * cos + v.y * sin, c.z + u.z * cos + v.z * sin, blur);
    }
  }

  // dz empurra o caminho inteiro em z (camadas de uma extrusão)
  path(path: PolylinePath, n: number, blur = 0, dz = 0): void {
    const p = this.cursor;
    for (let i = 0; i < n; i++) {
      path.sample((i + this.random()) / n, p);
      this.dot(p.x, p.y, p.z + dz, blur);
    }
  }

  // bolinha gaussiana (núcleos, cabeças, faróis)
  cluster(c: Vec3, radius: number, n: number): void {
    for (let i = 0; i < n; i++) this.dot(c.x, c.y, c.z, radius);
  }

  finish(): Float32Array {
    return this.writer.finish();
  }
}

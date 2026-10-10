import { pick, type ContourPoint } from './types';

const CELL = 0.04;
const SIDE_ZONE = 0.12;
const MIN_FACING = 0.35;

// grade espacial da borda do logo: acha vizinhos rápido (arcos colados na borda)
// e separa as pontas laterais, de onde saem as descargas mais bonitas
export class ContourIndex {
  readonly sides: readonly ContourPoint[];
  private readonly cells = new Map<number, ContourPoint[]>();

  constructor(
    readonly points: readonly ContourPoint[],
    // altura/largura da imagem: distâncias ficam todas em "larguras do logo"
    private readonly aspect: number,
  ) {
    for (const point of points) {
      const key = this.key(Math.floor(point.x / CELL), Math.floor((point.y * aspect) / CELL));
      const bucket = this.cells.get(key);
      if (bucket) bucket.push(point);
      else this.cells.set(key, [point]);
    }
    this.sides = points.filter((p) => p.x < SIDE_ZONE || p.x > 1 - SIDE_ZONE);
  }

  random(): ContourPoint | undefined {
    return pick(this.points);
  }

  randomSide(): ContourPoint | undefined {
    return pick(this.sides) ?? this.random();
  }

  // ponto da borda a uma distância entre min e max (em larguras do logo) e virado pro mesmo lado:
  // normais parecidas = mesma face da borda, então o arco não atravessa as letras
  near(origin: ContourPoint, min: number, max: number): ContourPoint | null {
    const cx = Math.floor(origin.x / CELL);
    const cy = Math.floor((origin.y * this.aspect) / CELL);
    const reach = Math.ceil(max / CELL);
    const found: ContourPoint[] = [];
    for (let dx = -reach; dx <= reach; dx++) {
      for (let dy = -reach; dy <= reach; dy++) {
        for (const point of this.cells.get(this.key(cx + dx, cy + dy)) ?? []) {
          const distance = Math.hypot(point.x - origin.x, (point.y - origin.y) * this.aspect);
          const facing = point.nx * origin.nx + point.ny * origin.ny;
          if (distance >= min && distance <= max && facing > MIN_FACING) found.push(point);
        }
      }
    }
    return pick(found) ?? null;
  }

  private key(x: number, y: number): number {
    return (x + 64) * 4096 + (y + 64);
  }
}

import type { ShapeStrategy } from './ShapeStrategy';
import { PLANE_XZ, at } from './PointBrush';
import { PolylinePath } from './PolylinePath';
import { TROPHY_EDGES, sampleProfile, trophyProfile } from './TrophyProfile';
import { TAU, type Random, type Vec3 } from './sampling';
import { arc, blob, polyline, trail, type Stroke, paint } from './strokes';

const MERIDIANS = 20;
const STAR_Y = 1.5;
const STAR_OUTER = 0.21;
const STAR_INNER = 0.088;

// taça de torno em linhas finas: anéis de latitude, meridianos, arestas acesas, alças em tubo e estrela no topo
export class TrophyShape implements ShapeStrategy {
  readonly key = 'trophy';

  generate(count: number, random: Random): Float32Array {
    return paint([...cup(), ...handles(), ...star()], count, random);
  }
}

function cup(): Stroke[] {
  const ring = (r: number, y: number, density: number): Stroke =>
    arc(at(0, y, 0), r, density, { plane: PLANE_XZ });
  const strokes: Stroke[] = sampleProfile(0.075)
    .filter((p) => p.r > 0.02)
    .map((p) => ring(p.r, p.y, 300));
  const profile = trophyProfile();
  TROPHY_EDGES.forEach((i) => {
    const p = profile[i];
    if (p) strokes.push(ring(p.r, p.y, i >= 19 ? 1500 : 900));
  });
  // borda virada: dois anéis colados por fora
  strokes.push(ring(1.02, 0.955, 900), ring(0.985, 0.97, 500));
  for (let j = 0; j < MERIDIANS; j++) {
    const a = (j * TAU) / MERIDIANS;
    const line = profile.filter((p) => p.r > 0).map((p) => at(Math.cos(a) * p.r, p.y, Math.sin(a) * p.r));
    strokes.push(...polyline(line, 210));
  }
  return strokes;
}

// alça "orelha": bézier presa no bojo, tubo de 4 fios em volta da linha de centro
function handles(): Stroke[] {
  return [1, -1].flatMap((side) => {
    const center: Vec3[] = [];
    const p0 = { x: 0.85, y: 0.62 };
    const p1 = { x: 1.42, y: 0.78 };
    const p2 = { x: 1.34, y: -0.08 };
    const p3 = { x: 0.7, y: -0.1 };
    for (let i = 0; i <= 48; i++) {
      const t = i / 48;
      const s = 1 - t;
      const x = s * s * s * p0.x + 3 * s * s * t * p1.x + 3 * s * t * t * p2.x + t * t * t * p3.x;
      const y = s * s * s * p0.y + 3 * s * s * t * p1.y + 3 * s * t * t * p2.y + t * t * t * p3.y;
      center.push(at(x * side, y, 0));
    }
    const lanes: readonly (readonly [number, number])[] = [
      [0.03, 0],
      [-0.03, 0],
      [0, 0.03],
      [0, -0.03],
    ];
    return lanes.map(([dn, dz]) => trail(new PolylinePath(offset(center, dn, dz)), 1000));
  });
}

function offset(pts: readonly Vec3[], dn: number, dz: number): Vec3[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)] ?? p;
    const b = pts[Math.min(pts.length - 1, i + 1)] ?? p;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    return at(p.x - ((b.y - a.y) / len) * dn, p.y + ((b.x - a.x) / len) * dn, p.z + dz);
  });
}

// estrela de 5 pontas de frente pra câmera (o shader não gira), com aro fino e miolo aceso
function star(): Stroke[] {
  const pts: Vec3[] = [];
  for (let i = 0; i <= 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? STAR_OUTER : STAR_INNER;
    pts.push(at(Math.cos(a) * r, STAR_Y + Math.sin(a) * r, 0));
  }
  return [
    ...polyline(pts, 1500),
    arc(at(0, STAR_Y, 0), 0.3, 500),
    blob(160, (b, n) => b.cluster(at(0, STAR_Y, 0), 0.03, n)),
  ];
}

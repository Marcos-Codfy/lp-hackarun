import { PolylinePath } from './PolylinePath';
import { at } from './PointBrush';
import type { Vec3 } from './sampling';

// "?" geométrico desenhado por linha de centro + espessura (unidades da forma, já centrado)
const SCALE = 1.16;
const HOOK_Y = 0.66;
const HOOK_R = 0.6;
const HALF_WIDTH = 0.19;
const HOOK_FROM = (200 * Math.PI) / 180;
const HOOK_TO = (-50 * Math.PI) / 180;
const STEM_TOP = -0.12;
const STEM_BOTTOM = -0.52;
const DOT_Y = -0.98;
const DOT_R = 0.2;
// meio da caixa (topo do gancho até o pé do ponto) vai pra origem
const OFFSET_Y = -((HOOK_Y + HOOK_R + HALF_WIDTH + DOT_Y - DOT_R) / 2);

const place = (x: number, y: number): Vec3 => at(x * SCALE, (y + OFFSET_Y) * SCALE);

function cubic(a: number, b: number, c: number, d: number, t: number): number {
  const s = 1 - t;
  return s * s * s * a + 3 * s * s * t * b + 3 * s * t * t * c + t * t * t * d;
}

// gancho em arco → pescoço em bézier (sai na tangente do arco, chega vertical) → haste
function centerline(): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i <= 120; i++) {
    const a = HOOK_FROM + ((HOOK_TO - HOOK_FROM) * i) / 120;
    pts.push({ x: Math.cos(a) * HOOK_R, y: HOOK_Y + Math.sin(a) * HOOK_R });
  }
  const p0 = { x: Math.cos(HOOK_TO) * HOOK_R, y: HOOK_Y + Math.sin(HOOK_TO) * HOOK_R };
  const p1 = { x: p0.x + Math.sin(HOOK_TO) * 0.15, y: p0.y - Math.cos(HOOK_TO) * 0.15 };
  const p2 = { x: 0, y: STEM_TOP + 0.15 };
  for (let i = 1; i <= 40; i++) {
    const t = i / 40;
    pts.push({ x: cubic(p0.x, p1.x, p2.x, 0, t), y: cubic(p0.y, p1.y, p2.y, STEM_TOP, t) });
  }
  for (let i = 1; i <= 12; i++) pts.push({ x: 0, y: STEM_TOP + ((STEM_BOTTOM - STEM_TOP) * i) / 12 });
  return pts;
}

// desloca a linha de centro pela normal (d em unidades de meia espessura: -1 borda esquerda, 1 direita)
function offset(pts: readonly { x: number; y: number }[], d: number): Vec3[] {
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)] ?? p;
    const b = pts[Math.min(pts.length - 1, i + 1)] ?? p;
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1;
    const nx = -(b.y - a.y) / len;
    const ny = (b.x - a.x) / len;
    return place(p.x + nx * d * HALF_WIDTH, p.y + ny * d * HALF_WIDTH);
  });
}

export interface GlyphParts {
  // contorno fechado do traço (bordas + tampas retas)
  readonly outline: PolylinePath;
  // linha do meio (vira a faixa tracejada de pista)
  readonly center: PolylinePath;
  // amostra um ponto da face: u ao longo do traço, d de -1 a 1 na largura
  face(u: number, d: number): Vec3;
  // quinas das tampas (arestas da extrusão)
  readonly corners: readonly Vec3[];
  readonly dot: { readonly center: Vec3; readonly radius: number };
}

export function buildQuestionGlyph(): GlyphParts {
  const spine = centerline();
  const left = offset(spine, -1);
  const right = offset(spine, 1);
  const first = left[0] ?? place(0, 0);
  const closed = [...left, ...[...right].reverse(), first];
  const center = new PolylinePath(offset(spine, 0));
  const leftPath = new PolylinePath(left);
  const rightPath = new PolylinePath(right);
  const a = at(0, 0);
  const b = at(0, 0);

  return {
    outline: new PolylinePath(closed),
    center,
    face: (u, d) => {
      leftPath.sample(u, a);
      rightPath.sample(u, b);
      const t = (d + 1) / 2;
      return at(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t);
    },
    corners: [first, right[0] ?? first, left[left.length - 1] ?? first, right[right.length - 1] ?? first],
    dot: { center: place(0, DOT_Y), radius: DOT_R * SCALE },
  };
}

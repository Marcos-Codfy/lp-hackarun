import type { ShapeStrategy } from './ShapeStrategy';
import { at } from './PointBrush';
import { buildQuestionGlyph, type GlyphParts } from './QuestionGlyph';
import { TAU, type Random } from './sampling';
import { arc, blob, line, paint, trail, type Stroke } from './strokes';

// extrusão: frente em z = +HALF_DEPTH (enigmaHeat acende z > 0.2), auréola atrás em z < -0.45 (gira no shader)
const HALF_DEPTH = 0.21;
const WALLS = [-0.105, 0, 0.105] as const;
const HALO_Z = -0.62;
const HALO_R = 1.72;
const DASH = 0.09;
const GAP = 0.07;

// "?" sólido: contorno cravado na frente, fatias finas formando as paredes, faixa tracejada de pista
// no meio do traço e uma auréola fina de HUD por trás
export class EnigmaShape implements ShapeStrategy {
  readonly key = 'enigma';

  generate(count: number, random: Random): Float32Array {
    const glyph = buildQuestionGlyph();
    return paint([...volume(glyph), ...face(glyph), ...halo()], count, random);
  }
}

function volume(g: GlyphParts): Stroke[] {
  const { center: c, radius: r } = g.dot;
  const dotRing = (z: number, density: number): Stroke => arc(at(c.x, c.y, z), r, density);
  return [
    trail(g.outline, 2600, HALF_DEPTH),
    dotRing(HALF_DEPTH, 2600),
    trail(g.outline, 1100, -HALF_DEPTH),
    dotRing(-HALF_DEPTH, 1100),
    ...WALLS.flatMap((z) => [trail(g.outline, 420, z), dotRing(z, 420)]),
    // arestas da extrusão nas quinas das tampas
    ...g.corners.map((p) => line(at(p.x, p.y, -HALF_DEPTH), at(p.x, p.y, HALF_DEPTH), 2600)),
  ];
}

function face(g: GlyphParts): Stroke[] {
  const { center: c, radius: r } = g.dot;
  const period = DASH + GAP;
  const dashes = Math.floor(g.center.length / period);
  return [
    // faixa central tracejada: só os trechos "cheios" recebem pontos
    blob(1500 * dashes * DASH, (b, n) => {
      const p = at(0, 0);
      for (let i = 0; i < n; i++) {
        const on = ((i + b.random()) / n) * dashes * DASH;
        const k = Math.floor(on / DASH);
        g.center.sample((k * period + (on - k * DASH)) / g.center.length, p);
        b.dot(p.x, p.y, HALF_DEPTH, 0.003);
      }
    }),
    // preenchimento ralo da face da frente: dá corpo sem virar nuvem
    blob(3200, (b, n) => {
      for (let i = 0; i < n; i++) {
        const p = g.face(b.random(), (b.random() * 2 - 1) * 0.85);
        b.dot(p.x, p.y, HALF_DEPTH, 0.004);
      }
    }),
    arc(at(c.x, c.y, HALF_DEPTH), r * 0.5, 900),
    blob(500, (b, n) => {
      for (let i = 0; i < n; i++) {
        const a = b.random() * TAU;
        const d = Math.sqrt(b.random()) * r * 0.85;
        b.dot(c.x + Math.cos(a) * d, c.y + Math.sin(a) * d, HALF_DEPTH, 0.003);
      }
    }),
  ];
}

// auréola: anel fino, três arcos de HUD e 72 marquinhas
function halo(): Stroke[] {
  const center = at(0, 0, HALO_Z);
  const strokes: Stroke[] = [arc(center, HALO_R, 240)];
  for (let k = 0; k < 3; k++) {
    const from = (k * TAU) / 3 + 0.18;
    strokes.push(arc(center, HALO_R + 0.07, 650, { from, to: from + TAU / 3 - 0.36 }));
  }
  for (let i = 0; i < 72; i++) {
    const a = (i * TAU) / 72;
    const inner = i % 6 === 0 ? HALO_R - 0.1 : HALO_R - 0.045;
    const dir = { x: Math.cos(a), y: Math.sin(a) };
    strokes.push(
      line(
        at(dir.x * inner, dir.y * inner, HALO_Z),
        at(dir.x * (HALO_R - 0.01), dir.y * (HALO_R - 0.01), HALO_Z),
        1200,
      ),
    );
  }
  return strokes;
}

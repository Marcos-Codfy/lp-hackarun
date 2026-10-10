import type { ShapeStrategy } from './ShapeStrategy';
import { PLANE_XZ, at, type Plane } from './PointBrush';
import { TAU, type Random } from './sampling';
import { arc, blob, line, paint, polyline, type Stroke } from './strokes';

// cronômetro-giroscópio. Raios, planos e o z do ponteiro estão espelhados em shapes.glsl (shapeOrbit/orbitHeat)
const BEZEL = [1.36, 1.43, 1.5] as const;
const BEZEL_DENSITY = [1000, 240, 1150] as const;
const TICK_OUT = 1.3;
const TICK_MINOR = 1.2;
const TICK_MAJOR = 1.08;
const HAND_Z = 0.04;
const HAND_TIP = 1.16;
const HAND_TAIL = -0.26;
const RING_B = 0.9;
const RING_C = 0.68;
const PUSHER_ANGLES = [Math.PI / 2 - 0.7, Math.PI / 2 + 0.7] as const;

// plano estático do anel C: contém o eixo z e a diagonal (1, -1); gira em torno dessa diagonal no shader
const C_AXIS = { x: Math.SQRT1_2, y: -Math.SQRT1_2, z: 0 };
const PLANE_C: Plane = { u: C_AXIS, v: { x: 0, y: 0, z: 1 } };

const polar = (r: number, a: number, z = 0) => at(Math.cos(a) * r, Math.sin(a) * r, z);

// mostrador de frente (aro em fitas, 60 marcas, coroa e botões), ponteiro de varredura
// e dois anéis-cardã girando em volta de um núcleo aceso
export class OrbitShape implements ShapeStrategy {
  readonly key = 'orbit';

  generate(count: number, random: Random): Float32Array {
    return paint([...dial(), ...crown(), ...hand(), ...gimbals(), ...core()], count, random);
  }
}

function dial(): Stroke[] {
  const strokes: Stroke[] = BEZEL.map((r, i) => arc(at(0, 0), r, BEZEL_DENSITY[i] ?? 300));
  strokes.push(arc(at(0, 0), 1.04, 160));
  for (let i = 0; i < 60; i++) {
    const a = Math.PI / 2 - (i * TAU) / 60;
    const major = i % 5 === 0;
    const inner = i === 0 ? 0.98 : major ? TICK_MAJOR : TICK_MINOR;
    // marca grossa = dois traços colados
    const lanes = major ? [-0.009, 0.009] : [0];
    lanes.forEach((offset) => {
      const nx = -Math.sin(a) * offset;
      const ny = Math.cos(a) * offset;
      const a0 = polar(inner, a);
      const a1 = polar(TICK_OUT, a);
      strokes.push(line(at(a0.x + nx, a0.y + ny), at(a1.x + nx, a1.y + ny), 1500));
    });
  }
  return strokes;
}

// coroa no topo e dois botões laterais: é isso que faz o círculo ler "cronômetro"
function crown(): Stroke[] {
  const d = 1300;
  const strokes: Stroke[] = [
    line(at(-0.07, 1.5), at(-0.07, 1.6), d),
    line(at(0.07, 1.5), at(0.07, 1.6), d),
    ...polyline([at(-0.18, 1.6), at(0.18, 1.6), at(0.18, 1.72), at(-0.18, 1.72), at(-0.18, 1.6)], d),
  ];
  for (let k = -2; k <= 2; k++) strokes.push(line(at(k * 0.06, 1.625), at(k * 0.06, 1.695), 700));
  PUSHER_ANGLES.forEach((a) => {
    const side = { x: -Math.sin(a) * 0.045, y: Math.cos(a) * 0.045 };
    const from = polar(1.5, a);
    const to = polar(1.6, a);
    const cap = polar(1.66, a);
    strokes.push(line(at(from.x + side.x, from.y + side.y), at(to.x + side.x, to.y + side.y), d));
    strokes.push(line(at(from.x - side.x, from.y - side.y), at(to.x - side.x, to.y - side.y), d));
    const s2 = { x: side.x * 1.9, y: side.y * 1.9 };
    strokes.push(
      ...polyline(
        [
          at(to.x - s2.x, to.y - s2.y),
          at(to.x + s2.x, to.y + s2.y),
          at(cap.x + s2.x, cap.y + s2.y),
          at(cap.x - s2.x, cap.y - s2.y),
          at(to.x - s2.x, to.y - s2.y),
        ],
        d,
      ),
    );
  });
  return strokes;
}

// ponteiro estático aponta pro 12; o shader gira tudo que está em z = HAND_Z
function hand(): Stroke[] {
  return [
    line(at(-0.006, HAND_TAIL, HAND_Z), at(-0.006, HAND_TIP, HAND_Z), 1500),
    line(at(0.006, HAND_TAIL, HAND_Z), at(0.006, HAND_TIP, HAND_Z), 1500),
    arc(at(0, 0, HAND_Z), 0.05, 1400),
    arc(at(0, HAND_TAIL + 0.04, HAND_Z), 0.035, 1400),
  ];
}

function gimbals(): Stroke[] {
  const ringB = [RING_B, RING_B + 0.025].map((r) => arc(at(0, 0), r, 700, { plane: PLANE_XZ }));
  const ringC = [RING_C, RING_C + 0.022].map((r) => arc(at(0, 0), r, 700, { plane: PLANE_C }));
  // satélites: pontos quentes que denunciam o giro dos anéis
  const beadB = polar(RING_B + 0.012, 0.6);
  const beadC = {
    x: C_AXIS.x * Math.cos(2.2) * RING_C,
    y: C_AXIS.y * Math.cos(2.2) * RING_C,
    z: Math.sin(2.2) * RING_C,
  };
  return [
    ...ringB,
    ...ringC,
    blob(90, (b, n) => b.cluster(at(beadB.x, 0, beadB.y), 0.018, n)),
    blob(70, (b, n) => b.cluster(beadC, 0.016, n)),
  ];
}

function core(): Stroke[] {
  return [
    blob(520, (b, n) => b.cluster(at(0, 0), 0.045, n)),
    blob(200, (b, n) => b.cluster(at(0, 0), 0.11, n)),
  ];
}

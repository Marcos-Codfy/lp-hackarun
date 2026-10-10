import type { ShapeStrategy } from './ShapeStrategy';
import { PLANE_XZ, at } from './PointBrush';
import { BEAM_BASE, MissionRoute, PACKET, STATIONS, beaconHeight } from './MissionRoute';
import { TAU, type Random, type Vec3 } from './sampling';
import { arc, blob, line, paint, trail, type Stroke } from './strokes';

const RINGS: readonly (readonly [number, number])[] = [
  [1.585, 760],
  [1.615, 760],
  [1.28, 380],
  [0.95, 300],
  [0.62, 300],
  [0.3, 340],
];
const PACKET_LEN = 0.026;

// mapa de missões em holograma: plataforma redonda (anéis, raios, régua), rota em S ligando 8 faróis
// e o farol final mais alto com coroa. Tudo deitado em y = 0 com faróis em pé: a inclinação pra câmera
// vem do shader (shapeMap), pra os feixes continuarem verticais na tela
export class MapShape implements ShapeStrategy {
  readonly key = 'map';

  generate(count: number, random: Random): Float32Array {
    const route = new MissionRoute();
    return paint([...platform(), ...road(route), ...beacons(route)], count, random);
  }
}

function platform(): Stroke[] {
  const o = at(0, 0, 0);
  const strokes: Stroke[] = RINGS.map(([r, d]) => arc(o, r, d, { plane: PLANE_XZ }));
  // borda de baixo da mesa: dá espessura ao holograma
  strokes.push(arc(at(0, -0.09, 0), 1.6, 300, { plane: PLANE_XZ }));
  for (let i = 0; i < 72; i++) {
    const a = (i * TAU) / 72;
    const inner = i % 6 === 0 ? 1.47 : 1.52;
    strokes.push(
      line(
        at(Math.cos(a) * inner, 0, Math.sin(a) * inner),
        at(Math.cos(a) * 1.565, 0, Math.sin(a) * 1.565),
        1300,
      ),
    );
  }
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12 + TAU / 24;
    strokes.push(
      line(at(Math.cos(a) * 0.32, 0, Math.sin(a) * 0.32), at(Math.cos(a) * 1.45, 0, Math.sin(a) * 1.45), 110),
    );
  }
  return strokes;
}

// estrada: linha central forte e duas bordas finas
function road(route: MissionRoute): Stroke[] {
  return [trail(route.path(0), 2200), trail(route.path(0.04), 900), trail(route.path(-0.04), 900)];
}

function beacons(route: MissionRoute): Stroke[] {
  const strokes: Stroke[] = [];
  for (let k = 0; k < STATIONS; k++) {
    const s = route.station(k);
    const h = beaconHeight(k);
    const final = k === STATIONS - 1;
    strokes.push(arc(at(s.x, 0.004, s.z), 0.085, 1500, { plane: PLANE_XZ }));
    strokes.push(arc(at(s.x, 0.004, s.z), 0.135, final ? 900 : 600, { plane: PLANE_XZ }));
    strokes.push(...beam(s, h, final));
    strokes.push(arc(at(s.x, h, s.z), 0.05, 1600, { plane: PLANE_XZ }));
    strokes.push(blob(final ? 90 : 45, (b, n) => b.cluster(at(s.x, h + 0.01, s.z), 0.016, n)));
    if (final) {
      strokes.push(arc(at(s.x, h + 0.06, s.z), 0.13, 1300, { plane: PLANE_XZ }));
      strokes.push(arc(at(s.x, h + 0.1, s.z), 0.2, 800, { plane: PLANE_XZ }));
    }
  }
  return strokes;
}

// feixe fino: um trilho fraco e pacotes densos que o shader faz subir (grosso demais estoura no bloom)
function beam(s: Vec3, h: number, final: boolean): Stroke[] {
  const packets = Math.round((h - BEAM_BASE) / PACKET);
  const rail = line(at(s.x, BEAM_BASE, s.z), at(s.x, h - 0.012, s.z), 650);
  const pulses = blob((final ? 2000 : 1500) * packets * PACKET_LEN, (b, n) => {
    for (let j = 0; j < n; j++) {
      const slot = Math.floor(b.random() * packets);
      b.dot(s.x, BEAM_BASE + slot * PACKET + b.random() * PACKET_LEN, s.z, 0.002);
    }
  });
  return [rail, pulses];
}

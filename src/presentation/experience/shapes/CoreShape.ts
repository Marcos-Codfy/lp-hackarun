import { SHAPE_RADIUS, type ShapeStrategy } from './ShapeStrategy';
import { PointWriter, TAU, type Random, type Vec3 } from './sampling';

// faixa do raio que guarda o código da fita (core.glsl decodifica e recalcula a casca)
export const CORE_CODE_SPAN = 0.25;
// código = fita * 16 + linha na largura (0..15) + posição ao longo do arco (fração)
export const CORE_CODE_LEVELS = 1024;
export const CORE_VEIL_RIBBON = 63;

const RIBBONS = 10;
// pontos soltos que desenham a silhueta inteira (o fresnel do shader acende só a borda)
const VEIL_SHARE = 0.1;
const MAX_LAT = 1.45;

// fita = arco de linhas paralelas num referencial próprio, ondulando e afinando nas pontas como seda
interface Ribbon {
  index: number;
  pole: Vec3;
  u: Vec3;
  v: Vec3;
  lat: number;
  width: number;
  start: number;
  span: number;
  wave: number;
  waveFreq: number;
  wavePhase: number;
  neck: number;
  neckPhase: number;
}

interface Line {
  ribbon: Ribbon;
  level: number;
  across: number;
  lat: number;
  points: number;
}

const cross = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.y * b.z - a.z * b.y,
  y: a.z * b.x - a.x * b.z,
  z: a.x * b.y - a.y * b.x,
});

const normalize = (a: Vec3): Vec3 => {
  const len = Math.hypot(a.x, a.y, a.z) || 1;
  return { x: a.x / len, y: a.y / len, z: a.z / len };
};

// globo do hero: fitas de "linhas de pontos" bem densas; o ruído do shader dobra tudo como seda
export class CoreShape implements ShapeStrategy {
  readonly key = 'core';

  generate(count: number, random: Random): Float32Array {
    const writer = new PointWriter(count);
    const veil = Math.round(count * VEIL_SHARE);
    this.layout(count - veil, random).forEach((line, i) => this.writeLine(writer, line, i));
    for (let i = 0; i < veil; i++) this.writeVeil(writer, random);
    return writer.finish();
  }

  // linhas por fita e pontos por linha (espaçamento constante ao longo do arco)
  private layout(budget: number, random: Random): Line[] {
    const spacing = 1.9 / Math.sqrt(Math.max(budget, 1));
    const ribbons = Array.from({ length: RIBBONS }, (_, i) => this.ribbon(i, random));
    const meanLength = ribbons.reduce((sum, r) => sum + r.span * TAU * 0.8, 0) / RIBBONS;
    const perRibbon = Math.max(3, Math.min(16, Math.round((budget * spacing) / meanLength / RIBBONS)));

    const lines: Line[] = [];
    ribbons.forEach((ribbon) => {
      for (let k = 0; k < perRibbon; k++) {
        const across = (k + 0.5) / perRibbon;
        const lat = ribbon.lat + (across - 0.5) * ribbon.width;
        lines.push({ ribbon, level: Math.round(across * 15), across, lat, points: 0 });
      }
    });

    const lengths = lines.map((line) => line.ribbon.span * Math.max(0.2, Math.cos(line.lat)));
    const lengthSum = lengths.reduce((sum, len) => sum + len, 0);
    let used = 0;
    lines.forEach((line, i) => {
      line.points = Math.max(8, Math.floor((budget * (lengths[i] ?? 1)) / lengthSum));
      used += line.points;
    });
    for (let i = 0; used < budget; i = (i + 1) % lines.length, used++) {
      const line = lines[i];
      if (line) line.points++;
    }
    return lines;
  }

  // polos espalhados (fibonacci) com um empurrão aleatório: as fitas cruzam a silhueta em ângulos variados
  private ribbon(index: number, random: Random): Ribbon {
    const y = 1 - (2 * (index + 0.5)) / RIBBONS;
    const ring = Math.sqrt(1 - y * y);
    const theta = index * Math.PI * (3 - Math.sqrt(5)) + random() * 0.9;
    const pole = normalize({ x: Math.cos(theta) * ring, y, z: Math.sin(theta) * ring });
    const helper = Math.abs(pole.y) < 0.9 ? { x: 0, y: 1, z: 0 } : { x: 1, y: 0, z: 0 };
    const u = normalize(cross(helper, pole));
    return {
      index,
      pole,
      u,
      v: cross(pole, u),
      lat: (random() * 2 - 1) * 0.75,
      width: 0.14 + random() * 0.2,
      start: random() * TAU,
      span: 0.5 + random() * 0.42,
      wave: 0.08 + random() * 0.2,
      waveFreq: 1 + random() * 1.6,
      wavePhase: random() * TAU,
      neck: 0.35 + random() * 0.5,
      neckPhase: random() * TAU,
    };
  }

  private writeLine(writer: PointWriter, line: Line, index: number): void {
    const { ribbon, across } = line;
    const offset = (index * 0.37) % 1;
    const base = ribbon.index * 16 + line.level;
    for (let j = 0; j < line.points; j++) {
      const along = (j + offset) / line.points;
      const lon = ribbon.start + along * ribbon.span * TAU;
      let lat = line.lat + ribbon.wave * Math.sin(ribbon.waveFreq * lon + ribbon.wavePhase);
      // a fita estreita e alarga ao longo do arco (pescoço), como tecido torcido
      lat += (across - 0.5) * ribbon.width * ribbon.neck * Math.sin(2 * lon + ribbon.neckPhase);
      lat = Math.max(-MAX_LAT, Math.min(MAX_LAT, lat));
      const c = Math.cos(lat);
      const lx = c * Math.cos(lon);
      const ly = Math.sin(lat);
      const lz = c * Math.sin(lon);
      this.push(
        writer,
        ribbon.u.x * lx + ribbon.pole.x * ly + ribbon.v.x * lz,
        ribbon.u.y * lx + ribbon.pole.y * ly + ribbon.v.y * lz,
        ribbon.u.z * lx + ribbon.pole.z * ly + ribbon.v.z * lz,
        base + 0.01 + along * 0.98,
      );
    }
  }

  private writeVeil(writer: PointWriter, random: Random): void {
    const y = random() * 2 - 1;
    const ring = Math.sqrt(1 - y * y);
    const theta = random() * TAU;
    this.push(writer, Math.cos(theta) * ring, y, Math.sin(theta) * ring, CORE_VEIL_RIBBON * 16 + 8.5);
  }

  // direção unitária + código guardado no raio
  private push(writer: PointWriter, x: number, y: number, z: number, code: number): void {
    const r = SHAPE_RADIUS * (1 + (CORE_CODE_SPAN * code) / CORE_CODE_LEVELS);
    writer.push(x * r, y * r, z * r);
  }
}

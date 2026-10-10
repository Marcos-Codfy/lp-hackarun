import { PolylinePath } from './PolylinePath';
import type { Vec3 } from './sampling';

// rota em espiral no plano da plataforma (y = 0): nasce na borda esquerda, contorna a frente e fecha no centro,
// onde fica o farol final. r = R·(1 − u)^CURVE é monotônico: o shader recupera u pelo raio (constantes em shapes.glsl)
export const STATIONS = 8;
const R_START = 1.3;
// < 1 segura o raio mais tempo lá fora: estações internas não se amontoam
const CURVE = 0.6;
const THETA_START = (160 * Math.PI) / 180;
const SWEEP = (230 * Math.PI) / 180;
// pacotes de energia sobem pelos faróis (MAP_PACKET/MAP_BASE no shader)
export const PACKET = 0.08;
export const BEAM_BASE = 0.03;

// faróis crescem a cada estação; o final dispara (múltiplos do pacote pra o fluxo não ter emenda)
export const beaconHeight = (k: number): number => BEAM_BASE + PACKET * (k === STATIONS - 1 ? 14 : 5 + k);

export class MissionRoute {
  // ponto da rota em u (0..1); side desloca pela normal local (bordas da estrada)
  at(u: number, side = 0): Vec3 {
    const p = this.center(u);
    if (side === 0) return p;
    const e = 1e-3;
    const a = this.center(Math.max(0, u - e));
    const b = this.center(Math.min(1, u + e));
    const len = Math.hypot(b.x - a.x, b.z - a.z) || 1;
    return { x: p.x - ((b.z - a.z) / len) * side, y: p.y, z: p.z + ((b.x - a.x) / len) * side };
  }

  path(side: number): PolylinePath {
    const pts: Vec3[] = [];
    // termina antes do centro: a curva aperta demais no fim e o farol final cobre o resto
    for (let i = 0; i <= 240; i++) pts.push(this.at((i / 240) * 0.97, side));
    return new PolylinePath(pts);
  }

  station(k: number): Vec3 {
    return this.center(k / (STATIONS - 1));
  }

  private center(u: number): Vec3 {
    const r = R_START * Math.pow(Math.max(0, 1 - u), CURVE);
    const theta = THETA_START - SWEEP * u;
    return { x: Math.cos(theta) * r, y: 0.006, z: Math.sin(theta) * r };
  }
}

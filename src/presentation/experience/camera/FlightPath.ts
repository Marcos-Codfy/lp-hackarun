import type { SceneKey } from '@presentation/app/AppEvents';
import { clamp, smoothstep } from '@shared/utils/math';

// desvio da câmera durante a troca entre duas cenas (somado por cima da mistura dos enquadramentos)
export interface FlightOffset {
  truck: number;
  crane: number;
  dolly: number;
  roll: number;
  fov: number;
  // 0..1: zoom blur do hiperespaço
  warp: number;
}

type Curve = (t: number, out: FlightOffset) => void;

const bump = (t: number): number => Math.sin(Math.PI * clamp(t));

// profundidade do mergulho: da câmera base (z = 6) até dentro da casca do globo
const DIVE = 5.3;

// trechos com coreografia própria; os outros só misturam os enquadramentos
const CURVES: Partial<Record<`${SceneKey}>${SceneKey}`, Curve>> = {
  // hero → sobre: atravessa a casca (partículas passando pela lente) e emerge no giroscópio
  'core>orbit': (t, o) => {
    const dive = smoothstep(0, 0.52, t);
    const rise = smoothstep(0.5, 1, t);
    o.dolly = -DIVE * dive * (1 - rise);
    o.warp = smoothstep(0.06, 0.34, t) * (1 - smoothstep(0.55, 0.9, t));
    o.fov = 16 * bump((t - 0.08) / 0.75);
    o.roll = 0.2 * bump(t) * (1 - t * 0.4);
  },
  'orbit>enigma': (t, o) => {
    o.truck = -0.55 * bump(t);
    o.roll = -0.05 * bump(t);
  },
  'enigma>map': (t, o) => {
    o.crane = 0.3 * bump(t);
    o.roll = 0.03 * bump(t);
  },
  'map>terrain': (t, o) => {
    o.dolly = -0.35 * bump(t);
    o.fov = 3 * bump(t);
  },
  'terrain>stage': (t, o) => {
    o.roll = 0.04 * bump(t);
    o.fov = -2 * bump(t);
  },
  'stage>trophy': (t, o) => {
    o.truck = 0.55 * bump(t);
    o.roll = 0.05 * bump(t);
  },
  'trophy>dust': (t, o) => {
    o.dolly = -0.4 * bump(t);
    o.warp = 0.25 * bump(t);
  },
  // poeira → globo final: puxa pra trás além do ponto e assenta (o globo se revela inteiro)
  'dust>core': (t, o) => {
    o.dolly = 1.3 * bump(t) * t;
    o.crane = 0.22 * bump(t);
    o.fov = -3 * bump(t);
  },
};

export class FlightPath {
  readonly offset: FlightOffset = { truck: 0, crane: 0, dolly: 0, roll: 0, fov: 0, warp: 0 };

  update(from: SceneKey, to: SceneKey, t: number): void {
    const o = this.offset;
    o.truck = 0;
    o.crane = 0;
    o.dolly = 0;
    o.roll = 0;
    o.fov = 0;
    o.warp = 0;
    if (from === to || t <= 0 || t >= 1) return;
    CURVES[`${from}>${to}`]?.(t, o);
  }
}

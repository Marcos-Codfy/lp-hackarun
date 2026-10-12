import { Vector3, type PerspectiveCamera } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { clamp, damp } from '@shared/utils/math';
import type { PointerTracker } from '../input/PointerTracker';
import { SHOT_FIELDS, SHOTS, type Shot } from './CameraShots';
import { FlightPath } from './FlightPath';
import { Handheld } from './Handheld';

export interface RigInput {
  weights: Float32Array;
  // trecho atual da trilha (forma de origem/destino e progresso suavizado)
  from: SceneKey;
  to: SceneKey;
  t: number;
  // centro da forma no mundo (pivô da órbita)
  pivot: Vector3;
  // aproximação da carga (unidades de mundo) e intensidade da câmera na mão (1 = cheia), por cena
  push: number;
  hand: number;
  velocity: number;
  time: number;
  delta: number;
}

type ShotBlend = Record<keyof Shot, number>;

const UP = new Vector3(0, 1, 0);
const RIGHT = new Vector3(1, 0, 0);

// diretor de fotografia: mistura os enquadramentos (pesos do morph), soma a coreografia do trecho,
// órbita lenta em volta da forma, câmera na mão, parallax do ponteiro e "kick" de FOV no scroll rápido
export class CameraRig {
  // zoom blur pedido pro pós (travessia do globo + scroll rápido)
  warp = 0;
  private readonly shots: Shot[];
  private readonly blend = Object.fromEntries(SHOT_FIELDS.map((field) => [field, 0])) as ShotBlend;
  private readonly flight = new FlightPath();
  private readonly hand = new Handheld();
  private readonly eye = new Vector3();
  private readonly aim = new Vector3();
  private px = 0;
  private py = 0;
  private kick = 0;
  // fase acumulada da órbita: velocidade misturada entre cenas sem salto de fase
  private phase = 0;

  constructor(
    private readonly camera: PerspectiveCamera,
    keys: readonly SceneKey[],
    private readonly baseZ: number,
    private readonly baseFov: number,
    private readonly animated: boolean,
  ) {
    this.shots = keys.map((key) => SHOTS[key]);
  }

  update(input: RigInput, pointer: PointerTracker | null): void {
    const b = this.mix(input.weights);
    const time = this.animated ? input.time : 0;
    if (this.animated) {
      this.flight.update(input.from, input.to, input.t);
      this.hand.update(time, input.hand);
    }
    const f = this.flight.offset;

    // movimento lento por cena: órbita em volta da forma e travelling lateral
    if (this.animated) this.phase += input.delta * b.speed;
    const yaw = b.yaw * Math.sin(this.phase);
    const pitch = b.pitch * Math.sin(this.phase * 0.73 + 1.3);
    const track = b.track * Math.sin(time * 0.09);

    // carregando, a câmera chega um pouco mais perto do globo (aproximação lenta, sem tremor)
    this.eye.set(b.truck + f.truck + track, b.crane + f.crane, this.baseZ + b.dolly + f.dolly - input.push);
    this.aim.set(b.truck + f.truck * 0.6 + track * 0.85, b.aim, 0);
    this.orbit(this.eye, input.pivot, yaw, pitch);
    this.orbit(this.aim, input.pivot, yaw, pitch);

    if (this.animated && pointer) {
      this.px = damp(this.px, pointer.ndc.x * pointer.active, 2.2, input.delta);
      this.py = damp(this.py, pointer.ndc.y * pointer.active, 2.2, input.delta);
    }
    this.eye.x += this.hand.offset.x + this.px * 0.32;
    this.eye.y += this.hand.offset.y + this.py * 0.2;
    this.aim.x += this.px * 0.06;

    this.camera.position.copy(this.eye);
    this.camera.lookAt(this.aim);
    this.camera.rotateZ(f.roll + this.hand.roll);

    this.kick = this.animated ? damp(this.kick, input.velocity * 6, 3, input.delta) : 0;
    const fov = this.baseFov + b.fov + f.fov + this.kick;
    if (Math.abs(this.camera.fov - fov) > 0.01) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
    this.warp = this.animated ? clamp(f.warp + input.velocity * 0.12) : 0;
  }

  // gira o ponto em volta do pivô: a forma fica no mesmo lugar da tela, vista de outro ângulo
  private orbit(point: Vector3, pivot: Vector3, yaw: number, pitch: number): void {
    point.sub(pivot).applyAxisAngle(UP, yaw).applyAxisAngle(RIGHT, pitch).add(pivot);
  }

  private mix(weights: Float32Array): ShotBlend {
    const b = this.blend;
    SHOT_FIELDS.forEach((field) => (b[field] = 0));
    let total = 0;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i] ?? 0;
      const shot = this.shots[i];
      if (w < 1e-4 || !shot) continue;
      total += w;
      SHOT_FIELDS.forEach((field) => (b[field] += shot[field] * w));
    }
    // velocidade da órbita nunca zera (seno parado = câmera morta)
    if (total < 1e-4) b.speed = 0.1;
    return b;
  }
}

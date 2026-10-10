import type { SceneKey } from '@presentation/app/AppEvents';
import { clamp, damp } from '@shared/utils/math';

// quão rápido o morph alcança o scroll (1/s); salto grande (âncora) acelera pra não demorar demais
const FOLLOW = 4.2;
const FOLLOW_FAR = 9;

// índice contínuo da sequência → par de formas (origem/destino) + progresso do trecho.
// o shader usa from/to/t pra atrasar cada partícula um pouco (transição em onda);
// os pesos suavizados servem pro layout e pra câmera no CPU
export class SceneMixer {
  readonly weights: Float32Array;
  from = 0;
  to = 0;
  t = 0;
  private readonly slots: Uint8Array;
  private progress = -1;

  constructor(
    sequence: readonly SceneKey[],
    private readonly keys: readonly SceneKey[],
  ) {
    this.weights = new Float32Array(keys.length);
    // seção i → forma única (core no começo e no fim, arena repetida etc. caem no mesmo slot)
    this.slots = Uint8Array.from(sequence, (key) => Math.max(0, keys.indexOf(key)));
  }

  indexOf(key: SceneKey): number {
    return this.keys.indexOf(key);
  }

  // snap = sem suavização (reduced motion e primeiro frame)
  update(target: number, delta: number, snap: boolean): void {
    const last = this.slots.length - 1;
    if (last < 0) return;
    const goal = clamp(target, 0, last);
    if (snap || this.progress < 0) this.progress = goal;
    else {
      const lambda = Math.abs(goal - this.progress) > 1.5 ? FOLLOW_FAR : FOLLOW;
      this.progress = damp(this.progress, goal, lambda, delta);
      if (Math.abs(goal - this.progress) < 1e-4) this.progress = goal;
    }

    const i = Math.min(Math.floor(this.progress), last);
    this.from = this.slots[i] ?? 0;
    this.to = this.slots[Math.min(i + 1, last)] ?? this.from;
    this.t = this.progress - i;

    // pesos com smoothstep (mesma curva média das partículas) pro layout/câmera
    const eased = this.t * this.t * (3 - 2 * this.t);
    this.weights.fill(0);
    this.weights[this.from] = (this.weights[this.from] ?? 0) + 1 - eased;
    this.weights[this.to] = (this.weights[this.to] ?? 0) + eased;
  }
}

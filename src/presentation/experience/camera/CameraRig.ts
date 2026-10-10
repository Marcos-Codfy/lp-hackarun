import { Vector3, type PerspectiveCamera } from 'three';
import type { SceneKey } from '@presentation/app/AppEvents';
import { damp } from '@shared/utils/math';
import type { PointerTracker } from '../input/PointerTracker';

// deslocamento da câmera por cena: dx, dy, dz, y do ponto de mira
const OFFSETS: Record<SceneKey, readonly [number, number, number, number]> = {
  core: [0, 0, 0, 0],
  nebula: [0, 0.35, -0.3, 0],
  enigma: [0, 0, 0, 0],
  route: [0, 0.1, -0.25, -0.05],
  // arena: sobe e olha pra baixo, pra grade virar piso
  arena: [0, 0.85, 0, -0.45],
  screen: [0, 0.1, 0, 0],
  trophy: [0, 0.15, 0.1, 0],
  dust: [0, 0, 0, 0],
};
const STRIDE = 4;

// câmera: offsets por cena (mesmos pesos do morph) + parallax do ponteiro + deriva lenta
export class CameraRig {
  private readonly offsets: Float32Array;
  private readonly look = new Vector3();
  private px = 0;
  private py = 0;

  constructor(
    private readonly camera: PerspectiveCamera,
    keys: readonly SceneKey[],
    private readonly baseZ: number,
    private readonly animated: boolean,
  ) {
    this.offsets = new Float32Array(keys.length * STRIDE);
    keys.forEach((key, i) => this.offsets.set(OFFSETS[key], i * STRIDE));
  }

  update(
    weights: Float32Array,
    pointer: PointerTracker | null,
    charge: number,
    time: number,
    delta: number,
  ): void {
    let dx = 0;
    let dy = 0;
    let dz = 0;
    let lookY = 0;
    for (let i = 0; i < weights.length; i++) {
      const w = weights[i] ?? 0;
      const o = i * STRIDE;
      dx += w * (this.offsets[o] ?? 0);
      dy += w * (this.offsets[o + 1] ?? 0);
      dz += w * (this.offsets[o + 2] ?? 0);
      lookY += w * (this.offsets[o + 3] ?? 0);
    }

    if (this.animated && pointer) {
      this.px = damp(this.px, pointer.ndc.x * pointer.active, 2.2, delta);
      this.py = damp(this.py, pointer.ndc.y * pointer.active, 2.2, delta);
    }
    const driftX = this.animated ? Math.sin(time * 0.11) * 0.06 : 0;
    const driftY = this.animated ? Math.cos(time * 0.09) * 0.04 : 0;

    // carregando, a câmera chega um pouco mais perto do globo
    this.camera.position.set(
      dx + this.px * 0.32 + driftX,
      dy + this.py * 0.2 + driftY,
      this.baseZ + dz - charge * 0.35,
    );
    this.look.set(this.px * 0.06, lookY, 0);
    this.camera.lookAt(this.look);
  }
}

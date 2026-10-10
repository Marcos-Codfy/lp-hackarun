import { Vector2, Vector3, type PerspectiveCamera } from 'three';
import { damp } from '@shared/utils/math';

// ponteiro do mouse em NDC + projetado no plano z = 0 do mundo (só desktop; toque é ignorado)
export class PointerTracker {
  readonly ndc = new Vector2();
  readonly world = new Vector3(0, 0, 100);
  // 0..1: some suave quando o mouse sai da janela
  active = 0;
  private target = 0;
  private readonly ray = new Vector3();

  constructor(private readonly camera: PerspectiveCamera) {
    window.addEventListener('pointermove', this.onMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', this.onLeave);
    window.addEventListener('blur', this.onLeave);
  }

  update(delta: number): void {
    this.active = damp(this.active, this.target, 4, delta);
    const { camera, ray } = this;
    ray.set(this.ndc.x, this.ndc.y, 0.5).unproject(camera).sub(camera.position).normalize();
    // raio quase paralelo ao plano: joga o ponto pra longe em vez de dividir por zero
    const distance = Math.abs(ray.z) > 1e-4 ? -camera.position.z / ray.z : 100;
    this.world.copy(camera.position).addScaledVector(ray, distance);
  }

  dispose(): void {
    window.removeEventListener('pointermove', this.onMove);
    document.documentElement.removeEventListener('pointerleave', this.onLeave);
    window.removeEventListener('blur', this.onLeave);
  }

  private readonly onMove = (event: PointerEvent): void => {
    if (event.pointerType === 'touch') return;
    this.ndc.set((event.clientX / window.innerWidth) * 2 - 1, -(event.clientY / window.innerHeight) * 2 + 1);
    this.target = 1;
  };

  private readonly onLeave = (): void => {
    this.target = 0;
  };
}

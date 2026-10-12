import { Vector2 } from 'three';

const TAU = Math.PI * 2;

// giro próprio de cada forma (no shader), pra não girar a rota/telão junto com o globo
export class ShapeSpin {
  // x: núcleo, y: troféu (o mesmo Vector2 vai direto pro uniform uSpin)
  readonly angles = new Vector2();

  // coreRate: giro do globo (rad/s), vindo do perfil de movimento da cena (CoreMotion)
  update(delta: number, coreRate: number): void {
    this.angles.x = (this.angles.x + delta * coreRate) % TAU;
    this.angles.y = (this.angles.y + delta * 0.45) % TAU;
  }
}

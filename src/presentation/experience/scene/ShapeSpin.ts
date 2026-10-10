import { Vector2 } from 'three';

const TAU = Math.PI * 2;

// giro próprio de cada forma (no shader), pra não girar a rota/telão junto com o globo
export class ShapeSpin {
  // x: núcleo, y: troféu (o mesmo Vector2 vai direto pro uniform uSpin)
  readonly angles = new Vector2();

  update(delta: number, charge: number): void {
    // carregando, o globo acelera bastante
    this.angles.x = (this.angles.x + delta * (0.12 + charge * 1.8)) % TAU;
    this.angles.y = (this.angles.y + delta * 0.45) % TAU;
  }
}

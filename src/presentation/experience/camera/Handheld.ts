import { Vector3 } from 'three';

// câmera "na mão": deriva lenta + ronco da carga final, tudo soma de senos (contínuo, nunca tremido aleatório)
export class Handheld {
  readonly offset = new Vector3();
  roll = 0;

  update(time: number, charge: number, flash: number): void {
    // frequências incomensuráveis: o movimento nunca se repete de um jeito perceptível
    let x = 0.035 * Math.sin(time * 0.31) + 0.018 * Math.sin(time * 0.71 + 1.3);
    let y = 0.028 * Math.sin(time * 0.27 + 2.1) + 0.012 * Math.sin(time * 0.63 + 0.4);
    let roll = 0.006 * Math.sin(time * 0.23 + 0.7);

    // carga: ronco que cresce com a energia; o estouro dá um tranco curto que some rápido
    const rumble = charge * charge * 0.022 + flash * 0.045;
    if (rumble > 1e-4) {
      x += rumble * (Math.sin(time * 17.3) + 0.6 * Math.sin(time * 23.9 + 1.7));
      y += rumble * (Math.sin(time * 19.1 + 0.5) + 0.5 * Math.sin(time * 29.3 + 2.2));
      roll += rumble * 0.3 * Math.sin(time * 13.7 + 0.9);
    }
    this.offset.set(x, y, 0);
    this.roll = roll;
  }

  reset(): void {
    this.offset.set(0, 0, 0);
    this.roll = 0;
  }
}

import { Vector3 } from 'three';

// câmera "na mão": deriva lenta, tudo soma de senos (contínuo, nunca tremido aleatório)
export class Handheld {
  readonly offset = new Vector3();
  roll = 0;

  // gain: 1 = deriva cheia; o clímax pede menos (câmera mais firme no globo final)
  update(time: number, gain = 1): void {
    // frequências incomensuráveis: o movimento nunca se repete de um jeito perceptível
    const x = 0.035 * Math.sin(time * 0.31) + 0.018 * Math.sin(time * 0.71 + 1.3);
    const y = 0.028 * Math.sin(time * 0.27 + 2.1) + 0.012 * Math.sin(time * 0.63 + 0.4);
    this.offset.set(x * gain, y * gain, 0);
    this.roll = 0.006 * Math.sin(time * 0.23 + 0.7) * gain;
  }
}

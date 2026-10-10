import type { ShapeStrategy } from './ShapeStrategy';
import { at } from './PointBrush';
import type { Random } from './sampling';
import { arc, blob, line, paint, type Stroke } from './strokes';

// piso synthwave. Constantes espelhadas em shapes.glsl (TERRAIN_*): o shader rola as linhas, levanta as montanhas
// e reescala a largura de cada linha pela profundidade. Etiqueta no y estático: 0 = linha, -0.01 = coluna
export const Z_NEAR = 1.3;
export const Z_FAR = -4.8;
const ROWS = 26;
const COL_STEP = 0.2;
// largura visível cresce linear com a distância (tronco da câmera, com folga)
const W_NEAR = 0.8;
const W_FAR = 5.4;
// distância (em unidades da forma) da câmera até z = 0
const EYE = 2.36;
const SUN_R = 1.2;
const SUN_Y = SUN_R * 0.24;
const SUN_Z = Z_FAR - 0.12;
// faixas cortadas no sol (v = y / raio, largura cresce pra baixo)
const CUTS: readonly (readonly [number, number])[] = [
  [0.42, 0.022],
  [0.28, 0.034],
  [0.13, 0.048],
  [-0.03, 0.062],
  [-0.19, 0.075],
];

export const widthAt = (z: number): number => W_NEAR + ((W_FAR - W_NEAR) * (Z_NEAR - z)) / (Z_NEAR - Z_FAR);

export class TerrainShape implements ShapeStrategy {
  readonly key = 'terrain';

  generate(count: number, random: Random): Float32Array {
    return paint([...rows(), ...columns(), ...sun(), ...horizon()], count, random);
  }
}

// mesma quantidade de pontos por linha: com a largura do tronco, cada linha ocupa a tela toda em qualquer profundidade
function rows(): Stroke[] {
  const step = (Z_NEAR - Z_FAR) / ROWS;
  const strokes: Stroke[] = [];
  for (let i = 0; i < ROWS; i++) {
    const z = Z_FAR + i * step;
    const w = widthAt(z);
    strokes.push(blob(520, (b, n) => b.segment(at(-w, 0, z), at(w, 0, z), n, 0)));
  }
  return strokes;
}

// colunas só onde estão dentro do tronco, amostradas uniformes em 1/distância (densidade parelha na tela)
function columns(): Stroke[] {
  const strokes: Stroke[] = [];
  const step = (Z_NEAR - Z_FAR) / ROWS;
  for (let x = -W_FAR; x <= W_FAR + 1e-6; x += COL_STEP) {
    const ax = Math.abs(x);
    const enter = ax <= W_NEAR ? Z_NEAR : Z_NEAR - ((ax - W_NEAR) / (W_FAR - W_NEAR)) * (Z_NEAR - Z_FAR);
    const near = 1 / (EYE - enter);
    const far = 1 / (EYE - Z_FAR);
    strokes.push(
      blob(450 * (near - far), (b, n) => {
        for (let i = 0; i < n; i++) {
          let z = EYE - 1 / (far + (near - far) * ((i + b.random()) / n));
          // nunca cai em cima de uma linha (o shader confundiria com linha e rolaria o ponto)
          const k = (z - Z_FAR) / step;
          if (Math.abs(k - Math.round(k)) < 0.01) z += step * 0.02;
          b.dot(x, -0.01, z);
        }
      }),
    );
  }
  return strokes;
}

// sol de scanlines: contorno acima do horizonte e faixas horizontais com cortes que engrossam pra baixo
function sun(): Stroke[] {
  const from = Math.asin(-SUN_Y / SUN_R);
  const strokes: Stroke[] = [
    arc(at(0, SUN_Y, SUN_Z), SUN_R, 1300, { from, to: Math.PI - from }),
    arc(at(0, SUN_Y, SUN_Z), SUN_R * 1.07, 200, { from: from + 0.06, to: Math.PI - from - 0.06 }),
  ];
  for (let v = -SUN_Y / SUN_R + 0.02; v < 0.985; v += 0.026) {
    if (CUTS.some(([c, width]) => Math.abs(v - c) < width)) continue;
    const half = Math.sqrt(1 - v * v) * SUN_R;
    strokes.push(line(at(-half, SUN_Y + v * SUN_R, SUN_Z), at(half, SUN_Y + v * SUN_R, SUN_Z), 330));
  }
  return strokes;
}

function horizon(): Stroke[] {
  const w = W_FAR * 1.05;
  return [line(at(-w, 0, Z_FAR - 0.06), at(w, 0, Z_FAR - 0.06), 300)];
}

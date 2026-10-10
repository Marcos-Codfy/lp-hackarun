// tipos do raio procedural em volta do logo (coordenadas sempre em px do canvas, já com DPR)
export interface Vec {
  x: number;
  y: number;
}

// ponto da borda do logo: posição normalizada (0..1 na caixa da imagem) + normal pra fora
export interface ContourPoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}

export type BoltKind = 'strike' | 'arc' | 'crackle';

export type Tint = 'blue' | 'violet';

export interface BoltStroke {
  path: Path2D;
  // multiplicador da espessura (tronco = 1, galhos menores)
  width: number;
}

export interface Bolt {
  kind: BoltKind;
  tint: Tint;
  // duas variações do mesmo raio: a troca no meio da vida simula o "re-strike" real
  strokes: BoltStroke[];
  restrike: BoltStroke[] | null;
  origin: Vec | null;
  born: number;
  life: number;
  intensity: number;
}

export const rand = (min: number, max: number): number => min + Math.random() * (max - min);

export const chance = (p: number): boolean => Math.random() < p;

export function pick<T>(items: readonly T[]): T | undefined {
  return items[Math.floor(Math.random() * items.length)];
}

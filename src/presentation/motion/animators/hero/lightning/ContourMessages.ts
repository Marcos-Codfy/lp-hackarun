// contrato entre a thread principal e o contour.worker
export interface ContourRequest {
  // URL absoluta do arquivo que a <img> do logo usou (vem do cache)
  src: string;
  width: number;
  height: number;
}

// pontos achatados: x, y, nx, ny por ponto (transferível, sem custo de clonar objetos)
export type ContourReply = { points: Float32Array } | { error: string };

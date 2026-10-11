// tudo que as partículas precisam do CPU: um alvo xyz por cena (na ordem das chaves) + atributos por partícula
export interface ParticleBuffers {
  readonly targets: readonly Float32Array[];
  readonly seeds: Float32Array;
  readonly scales: Float32Array;
}

// os buffers vão do worker pra thread principal por transferência (sem cópia)
export function transferablesOf(buffers: ParticleBuffers): ArrayBuffer[] {
  return [...buffers.targets, buffers.seeds, buffers.scales]
    .map((array) => array.buffer)
    .filter((buffer): buffer is ArrayBuffer => buffer instanceof ArrayBuffer);
}

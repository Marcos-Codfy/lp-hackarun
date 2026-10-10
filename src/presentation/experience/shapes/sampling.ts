export type Random = () => number;

export const TAU = Math.PI * 2;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const vec3 = (): Vec3 => ({ x: 0, y: 0, z: 0 });

// Box-Muller: normal padrão (média 0, desvio 1)
export function gaussian(random: Random): number {
  const u = 1 - random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * random());
}

// divide o total por proporções; o resto de arredondamento vai pra última parte
export function split(count: number, shares: readonly number[]): number[] {
  const parts = shares.map((share) => Math.floor(count * share));
  const used = parts.reduce((sum, part) => sum + part, 0);
  parts[parts.length - 1] = (parts[parts.length - 1] ?? 0) + count - used;
  return parts;
}

// escreve xyz em sequência sem estourar o buffer
export class PointWriter {
  readonly data: Float32Array;
  private index = 0;

  constructor(readonly count: number) {
    this.data = new Float32Array(count * 3);
  }

  get full(): boolean {
    return this.index >= this.count;
  }

  push(x: number, y: number, z: number): void {
    if (this.full) return;
    const o = this.index * 3;
    this.data[o] = x;
    this.data[o + 1] = y;
    this.data[o + 2] = z;
    this.index++;
  }

  // se alguma forma gerar menos que o pedido, repete pontos em vez de largar zeros na origem
  finish(): Float32Array {
    const written = this.index;
    for (let i = written; written > 0 && i < this.count; i++) {
      this.data.copyWithin(i * 3, (i % written) * 3, (i % written) * 3 + 3);
    }
    this.index = this.count;
    return this.data;
  }
}

// espalha 10 bits pra intercalar x e y no código de Morton
const spread10 = (v: number): number => {
  let x = v & 1023;
  x = (x | (x << 16)) & 0x030000ff;
  x = (x | (x << 8)) & 0x0300f00f;
  x = (x | (x << 4)) & 0x030c30c3;
  return (x | (x << 2)) & 0x09249249;
};

// permutação fixa compartilhada por todas as formas (mesma semente pro mesmo count)
export function sharedPermutation(count: number, random: Random): Uint32Array {
  const order = new Uint32Array(count);
  for (let i = 0; i < count; i++) order[i] = i;
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    const tmp = order[i] ?? 0;
    order[i] = order[j] ?? 0;
    order[j] = tmp;
  }
  return order;
}

// ordena por posição na tela (Morton em x/y) e aplica a permutação comum:
// a partícula k ocupa o "mesmo lugar relativo" em toda forma, então o morph flui em vez de embaralhar.
// como a permutação é aleatória, cortar o fim do buffer (drawRange) ainda mostra a forma inteira
export function coherentOrder(data: Float32Array, permutation: Uint32Array): Float32Array {
  const count = data.length / 3;
  let minX = Infinity,
    maxX = -Infinity,
    minY = Infinity,
    maxY = -Infinity;
  for (let i = 0; i < count; i++) {
    const x = data[i * 3] ?? 0;
    const y = data[i * 3 + 1] ?? 0;
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }
  const sx = 1023 / (maxX - minX || 1);
  const sy = 1023 / (maxY - minY || 1);
  // chave = código × M + índice: o sort numérico nativo do Float64Array (sem comparador) é bem mais rápido
  const slots = 2 ** Math.ceil(Math.log2(count + 1));
  const keys = new Float64Array(count);
  for (let i = 0; i < count; i++) {
    const gx = Math.round(((data[i * 3] ?? 0) - minX) * sx);
    // y cresce pra cima no 3D: inverte pra ordem de leitura (cima → baixo)
    const gy = Math.round((maxY - (data[i * 3 + 1] ?? 0)) * sy);
    keys[i] = ((spread10(gx) | (spread10(gy) << 1)) >>> 0) * slots + i;
  }
  keys.sort();

  const out = new Float32Array(data.length);
  for (let k = 0; k < count; k++) {
    const src = ((keys[permutation[k] ?? k] ?? k) % slots) * 3;
    out[k * 3] = data[src] ?? 0;
    out[k * 3 + 1] = data[src + 1] ?? 0;
    out[k * 3 + 2] = data[src + 2] ?? 0;
  }
  return out;
}

// bolinha gaussiana em volta de um centro
export function pushCluster(writer: PointWriter, n: number, c: Vec3, radius: number, random: Random): void {
  for (let i = 0; i < n; i++) {
    writer.push(
      c.x + gaussian(random) * radius,
      c.y + gaussian(random) * radius,
      c.z + gaussian(random) * radius,
    );
  }
}

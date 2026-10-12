type RandomSource = Partial<Pick<Crypto, 'randomUUID' | 'getRandomValues'>>;

// chave de um envio (UUID v4). randomUUID só existe em contexto seguro (https ou localhost):
// no celular abrindo pelo IP da rede cai no getRandomValues, e sem crypto nenhum no Math.random
export function newIdempotencyKey(
  source: RandomSource | undefined = globalThis.crypto,
  random: () => number = Math.random,
): string {
  if (typeof source?.randomUUID === 'function') return source.randomUUID();
  const bytes = new Uint8Array(16);
  if (typeof source?.getRandomValues === 'function') source.getRandomValues(bytes);
  else bytes.forEach((_, i) => (bytes[i] = Math.floor(random() * 256)));
  // bits de versão (4) e variante (10xx) do RFC 9562
  bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
  bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// o mesmo formato que o servidor aceita (IDEMPOTENCY_KEY_PATTERN do apps-script/Validation.gs): chave lida do
// rascunho só volta se passar
const KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/;

export const isIdempotencyKey = (value: unknown): value is string =>
  typeof value === 'string' && KEY_PATTERN.test(value);

// entrada e saída dos scripts de QA: argumentos, URL obrigatória, pasta de saída e impressão
import { mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseArgs } from 'node:util';

const OUT_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', 'out');

export function print(...parts) {
  process.stdout.write(`${parts.join(' ')}\n`);
}

export function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exit(1);
}

// usage = linha de "uso:" mostrada quando falta a URL ou ela é inválida
export function readArgs(usage, options = {}) {
  const { values, positionals } = parseArgs({ allowPositionals: true, options });
  const [url, ...rest] = positionals;
  if (!url || !URL.canParse(url)) fail(`uso: ${usage}`);
  return { url, rest, flags: values };
}

// sem pasta informada, grava em scripts/qa/out/<nome> (fora do Git)
export function outDir(name, custom) {
  const dir = custom ? resolve(custom) : join(OUT_ROOT, name);
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function median(values) {
  const sorted = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (sorted.length === 0) return NaN;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

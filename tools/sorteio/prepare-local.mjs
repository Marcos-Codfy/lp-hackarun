// prepara a planilha de TESTE do sorteio: copia o xlsx baixado do Drive (a pasta Downloads, por padrão) para
// .local/sorteio/ e marca uma parte dos inscritos como "credenciado", pra simular o dia do credenciamento.
// A planilha original e a do Drive nunca são alteradas. Uso:
//   npm run sorteio:preparar                  (usa o xlsx mais recente "HackaRun 2026 · Inscrições" de Downloads, 85%)
//   npm run sorteio:preparar -- <arquivo.xlsx> <porcentagem 1-100>
import { copyFile, mkdir, readdir, stat } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import ExcelJS from 'exceljs';

const OUT_DIR = new URL('../../.local/sorteio/', import.meta.url);
const OUT = new URL('hackarun-teste.xlsx', OUT_DIR);

async function latestDownload() {
  const dir = join(homedir(), 'Downloads');
  const names = (await readdir(dir)).filter((n) => /^HackaRun 2026.*Inscri.*\.xlsx$/i.test(n));
  if (names.length === 0)
    throw new Error(`Não achei a planilha "HackaRun 2026 · Inscrições.xlsx" em ${dir}.`);
  const dated = await Promise.all(names.map(async (n) => ({ n, t: (await stat(join(dir, n))).mtimeMs })));
  return join(dir, dated.sort((a, b) => b.t - a.t)[0].n);
}

// sorteio com semente fixa: a mesma cópia sai igual toda vez
function lcg(seed) {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
}

const source = process.argv[2] ?? (await latestDownload());
const percent = Number(process.argv[3] ?? 85);
if (!(percent > 0 && percent <= 100)) throw new Error('A porcentagem de credenciados vai de 1 a 100.');

await mkdir(OUT_DIR, { recursive: true });
await copyFile(source, OUT);

const book = new ExcelJS.Workbook();
await book.xlsx.readFile(OUT.pathname.replace(/^\/(\w:)/, '$1'));
const sheet = book.getWorksheet('Inscritos');
const headers = new Map();
sheet.getRow(1).eachCell((cell, col) => headers.set(String(cell.value).trim(), col));
const statusCol = headers.get('Status');
const protocolCol = headers.get('Protocolo');
const random = lcg(2026);
let marked = 0;
let total = 0;
for (let i = 2; i <= sheet.rowCount; i++) {
  const row = sheet.getRow(i);
  if (!row.getCell(protocolCol).value) continue;
  total++;
  const accredited = random() * 100 < percent;
  row.getCell(statusCol).value = accredited ? 'credenciado' : 'ausente';
  if (accredited) marked++;
}
await book.xlsx.writeFile(OUT.pathname.replace(/^\/(\w:)/, '$1'));
console.log(
  `Cópia de teste pronta: ${marked} credenciados e ${total - marked} ausentes (de ${total} inscritos).`,
);
console.log(`Arquivo: ${OUT.pathname.replace(/^\/(\w:)/, '$1')}`);
console.log(`Origem (intacta): ${source}`);

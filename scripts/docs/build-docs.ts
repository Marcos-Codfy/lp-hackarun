// gera os PDFs de documentação em docs/pdf e copia pra DOCS_OUT_DIR (se definido no .env)
// uso: npm run docs:pdf
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGuidePdf, buildStackPdf } from './documents.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const envFile = join(root, '.env');
if (existsSync(envFile)) process.loadEnvFile(envFile);

const outDir = join(root, 'docs/pdf');
mkdirSync(outDir, { recursive: true });

const files = {
  stack: 'HackaRun_LP_Stack_e_Padroes.pdf',
  guide: 'HackaRun_LP_Guia_do_Projeto.pdf',
};

const date = new Date();
await buildStackPdf(root, join(outDir, files.stack), date);
await buildGuidePdf(root, join(outDir, files.guide), date);

const target = process.env['DOCS_OUT_DIR'];
if (target) {
  mkdirSync(target, { recursive: true });
  for (const name of Object.values(files)) copyFileSync(join(outDir, name), join(target, name));
  copyFileSync(join(root, 'docs/GUIA_DO_PROJETO.md'), join(target, 'GUIA_DO_PROJETO.md'));
}

console.warn(`[docs] PDFs gerados em ${outDir}${target ? ` e copiados para ${target}` : ''}`);

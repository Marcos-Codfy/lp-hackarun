// roda o Lighthouse (mobile por padrão) várias vezes no mesmo navegador do QA e resume com a mediana
// uso: node lighthouse.mjs <url> [--runs=3] [--desktop]
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { browserPath } from './lib/browser.mjs';
import { fail, outDir, print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node lighthouse.mjs <url> [--runs=3] [--desktop]', {
  runs: { type: 'string', default: '3' },
  desktop: { type: 'boolean', default: false },
});
const here = dirname(fileURLToPath(import.meta.url));
const cli = join(here, 'node_modules', 'lighthouse', 'cli', 'index.js');
if (!existsSync(cli)) fail('Lighthouse não instalado: rode "npm install" dentro de scripts/qa');

// o Lighthouse acha o navegador pelo CHROME_PATH; sem Brave/Chrome instalado, usa o Chromium do Playwright
const env = { ...process.env, CHROME_PATH: browserPath() ?? chromium.executablePath() };
const dir = outDir('lighthouse');
const reports = [];
for (let run = 1; run <= Number(flags.runs); run++) {
  const file = join(dir, `${flags.desktop ? 'desktop' : 'mobile'}-${run}.json`);
  print(`rodada ${run}...`);
  const result = spawnSync(
    process.execPath,
    [
      cli,
      url,
      '--quiet',
      '--output=json',
      `--output-path=${file}`,
      '--chrome-flags=--headless=new --enable-gpu',
      ...(flags.desktop ? ['--preset=desktop'] : []),
    ],
    { env, stdio: 'inherit' },
  );
  if (result.status !== 0) fail(`Lighthouse falhou na rodada ${run}`);
  reports.push(file);
}

spawnSync(process.execPath, [join(here, 'lighthouse-summary.mjs'), ...reports], { stdio: 'inherit' });

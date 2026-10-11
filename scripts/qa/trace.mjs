// trace do Chrome até o 1º paint: soma o trabalho da thread principal por tipo, mostra quando cada
// arquivo terminou de chegar e os passos do boot (boot:<nome>). Abra o .json no painel Performance.
// uso: node trace.mjs <url> [--out=arquivo.json] [--cpu=4]
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { MOBILE, launch, throttle } from './lib/browser.mjs';
import { outDir, print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node trace.mjs <url> [--out=arquivo.json] [--cpu=4]', {
  out: { type: 'string' },
  cpu: { type: 'string', default: '4' },
});
const file = flags.out ?? join(outDir('trace'), 'trace.json');
const CATEGORIES = [
  'devtools.timeline',
  'disabled-by-default-devtools.timeline',
  'loading',
  'blink.user_timing',
];

const browser = await launch();
const context = await browser.newContext(MOBILE);
const page = await context.newPage();
await throttle(context, page, { network: 'slow4g', cpu: Number(flags.cpu) });
await browser.startTracing(page, { path: file, categories: CATEGORIES });
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(1500);
await browser.stopTracing();
const bootSteps = await page.evaluate(() =>
  performance
    .getEntriesByType('measure')
    .filter((m) => m.name.startsWith('boot:'))
    .map((m) => [m.name, Math.round(m.startTime), Math.round(m.duration)]),
);
await browser.close();

const raw = JSON.parse(readFileSync(file, 'utf8'));
const events = raw.traceEvents ?? raw;
const mainThreads = new Set(
  events
    .filter((e) => e.ph === 'M' && e.name === 'thread_name' && e.args?.name === 'CrRendererMain')
    .map((e) => `${e.pid}:${e.tid}`),
);
const t0 = events.find((e) => e.name === 'navigationStart')?.ts ?? events[0].ts;
const fcp = events.find((e) => e.name === 'firstContentfulPaint')?.ts ?? Infinity;
const ms = (us) => String(Math.round(us / 1000)).padStart(6);
print('FCP', Number.isFinite(fcp) ? `${Math.round((fcp - t0) / 1000)} ms` : 'não registrado');

// eventos aninhados somam em mais de uma linha: compare tipos entre rodadas, não some a coluna
const totals = new Map();
for (const e of events) {
  if (e.ph !== 'X' || !e.dur || e.ts < t0 || e.ts > fcp || !mainThreads.has(`${e.pid}:${e.tid}`)) continue;
  totals.set(e.name, (totals.get(e.name) ?? 0) + e.dur);
}
print('\nthread principal até o FCP:');
for (const [name, dur] of [...totals].sort((a, b) => b[1] - a[1]).slice(0, 18)) print(ms(dur), 'ms', name);

const urls = new Map();
for (const e of events) {
  if (e.name !== 'ResourceSendRequest') continue;
  urls.set(e.args.data.requestId, e.args.data.url.split('/').pop().slice(0, 48));
}
print('\narquivos (fim do download, desde a navegação):');
for (const e of events) {
  const name = e.name === 'ResourceFinish' ? urls.get(e.args.data.requestId) : undefined;
  if (name) print(ms(e.ts - t0), 'ms', name);
}

print('\npassos do boot [início, duração] ms:');
for (const [name, start, duration] of bootSteps) {
  print(String(start).padStart(6), String(duration).padStart(5), name);
}
print('\ntrace salvo em', file);

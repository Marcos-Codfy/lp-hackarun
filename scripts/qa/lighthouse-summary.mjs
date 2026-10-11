// resumo de relatórios JSON do Lighthouse: nota, métricas, tarefas longas e bootup por script.
// com mais de um arquivo, imprime também a mediana (as medições oscilam entre rodadas)
// uso: node lighthouse-summary.mjs <relatorio.json> [outro.json ...]
import { readFileSync } from 'node:fs';
import { fail, median, print } from './lib/cli.mjs';

const files = process.argv.slice(2);
if (files.length === 0) fail('uso: node lighthouse-summary.mjs <relatorio.json> [outro.json ...]');

const METRICS = {
  TBT: 'total-blocking-time',
  LCP: 'largest-contentful-paint',
  FCP: 'first-contentful-paint',
  SI: 'speed-index',
  CLS: 'cumulative-layout-shift',
};
const KEYS = ['perf', ...Object.keys(METRICS)];
const show = (key, value) => (key === 'CLS' ? value.toFixed(3) : Math.round(value));
const line = (row) => KEYS.map((key) => `${key} ${show(key, row[key])}`).join(' | ');
const fileName = (url = '') => url.split('/').pop() ?? '';

const rows = files.map((file) => {
  const report = JSON.parse(readFileSync(file, 'utf8'));
  const audits = report.audits;
  const row = { perf: (report.categories.performance?.score ?? NaN) * 100 };
  for (const [key, id] of Object.entries(METRICS)) row[key] = audits[id]?.numericValue ?? NaN;

  const longTasks = (audits['long-tasks']?.details?.items ?? []).map(
    (t) => `${fileName(t.url).slice(0, 18)}@${Math.round(t.startTime)}:${Math.round(t.duration)}`,
  );
  const bootup = (audits['bootup-time']?.details?.items ?? [])
    .slice(0, 4)
    .map(
      (t) => `${fileName(t.url).slice(0, 22)} script ${Math.round(t.scripting)} total ${Math.round(t.total)}`,
    );
  const mainThread = (audits['mainthread-work-breakdown']?.details?.items ?? []).map(
    (t) => `${t.group}:${Math.round(t.duration)}`,
  );
  print(`${file}: ${line(row)}`);
  print('  tarefas longas:', longTasks.join(' ') || 'nenhuma');
  print('  bootup:', bootup.join(' | '));
  print('  thread principal:', mainThread.join(' '));
  return row;
});

if (rows.length > 1) {
  const middle = Object.fromEntries(KEYS.map((key) => [key, median(rows.map((row) => row[key]))]));
  print(`\nmediana de ${rows.length}: ${line(middle)}`);
}

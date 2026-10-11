// tarefas longas (> 50 ms) no carregamento: celular com CPU mais lenta e 4G lento, várias rodadas
// uso: node longtasks.mjs <url> [--cpu=4] [--runs=3]
import { MOBILE, launch, throttle } from './lib/browser.mjs';
import { median, print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node longtasks.mjs <url> [--cpu=4] [--runs=3]', {
  cpu: { type: 'string', default: '4' },
  runs: { type: 'string', default: '3' },
});
const cpu = Number(flags.cpu);

const browser = await launch();
const results = [];
for (let run = 1; run <= Number(flags.runs); run++) {
  const context = await browser.newContext(MOBILE);
  const page = await context.newPage();
  await throttle(context, page, { network: 'slow4g', cpu });
  await page.addInitScript(() => {
    window.__longTasks = [];
    window.__lcp = 0;
    new PerformanceObserver((list) => {
      for (const t of list.getEntries())
        window.__longTasks.push([Math.round(t.startTime), Math.round(t.duration)]);
    }).observe({ type: 'longtask', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = Math.round(entry.startTime);
    }).observe({ type: 'largest-contentful-paint', buffered: true });
  });
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);

  const r = await page.evaluate(() => ({
    fcp: Math.round(performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? -1),
    lcp: window.__lcp,
    domInteractive: Math.round(performance.getEntriesByType('navigation')[0]?.domInteractive ?? -1),
    longTasks: window.__longTasks,
  }));
  results.push(r);
  // [início, duração] em ms; só as 8 primeiras pra caber na linha
  print(
    `cpu x${cpu} slow4G rodada ${run}: FCP ${r.fcp} | LCP ${r.lcp} | domInteractive ${r.domInteractive} |`,
    `${r.longTasks.length} tarefas longas ${JSON.stringify(r.longTasks.slice(0, 8))}`,
  );
  await context.close();
}
await browser.close();

// soma do que passou de 50 ms em cada tarefa: parecido com o TBT, mas até load + 2,5 s
const blocking = (r) => r.longTasks.reduce((sum, [, duration]) => sum + Math.max(0, duration - 50), 0);
const mid = (pick) => Math.round(median(results.map(pick)));
print(
  `mediana: FCP ${mid((r) => r.fcp)} | LCP ${mid((r) => r.lcp)} | tarefas longas ${mid((r) => r.longTasks.length)} |`,
  `bloqueio acima de 50 ms ${mid(blocking)} ms`,
);

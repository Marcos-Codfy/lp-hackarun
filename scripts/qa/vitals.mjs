// LCP, CLS, load e tempo até o 3D, em 4G simulado e sem limite de rede
// uso: node vitals.mjs <url> [--mobile]
import { DESKTOP, MOBILE, launch, throttle, waitForExperience } from './lib/browser.mjs';
import { print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node vitals.mjs <url> [--mobile]', {
  mobile: { type: 'boolean', default: false },
});
const device = flags.mobile ? 'mobile' : 'desktop';

const browser = await launch();
for (const network of ['4g', 'wifi']) {
  const context = await browser.newContext(flags.mobile ? MOBILE : DESKTOP);
  const page = await context.newPage();
  // CPU 4x mais lenta só no celular em 4G; o "wifi" é a referência sem limite nenhum
  if (network === '4g') await throttle(context, page, { network, cpu: flags.mobile ? 4 : 1 });
  await page.addInitScript(() => {
    window.__lcp = 0;
    window.__cls = 0;
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) window.__lcp = entry.startTime;
    }).observe({ type: 'largest-contentful-paint', buffered: true });
    new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) if (!entry.hadRecentInput) window.__cls += entry.value;
    }).observe({ type: 'layout-shift', buffered: true });
  });

  const start = Date.now();
  await page.goto(url, { waitUntil: 'load' });
  const load = Date.now() - start;
  const ready = (await waitForExperience(page, 60000)) ? `${Date.now() - start} ms` : 'não carregou';
  await page.waitForTimeout(800);

  const vitals = await page.evaluate(() => ({
    lcp: Math.round(window.__lcp),
    cls: Number(window.__cls.toFixed(3)),
    kb: Math.round(
      performance.getEntriesByType('resource').reduce((sum, r) => sum + (r.transferSize || 0), 0) / 1024,
    ),
  }));
  print(
    `${device} ${network}: LCP ${vitals.lcp} ms | CLS ${vitals.cls} | load ${load} ms | 3D pronto ${ready} |`,
    `transferido ${vitals.kb} KB`,
  );
  await context.close();
}
await browser.close();

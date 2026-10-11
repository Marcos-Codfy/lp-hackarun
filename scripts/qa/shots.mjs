// capturas da página: topo + uma por seletor (rola até o elemento; "@0.5" desloca meia tela)
// uso: node shots.mjs <url> [largura] [altura] [pasta] ["#sobre,#missoes@0.5,..."] [--mobile]
import { collectConsole, launch, waitForExperience } from './lib/browser.mjs';
import { outDir, print, readArgs } from './lib/cli.mjs';

const USAGE = 'node shots.mjs <url> [largura] [altura] [pasta] ["seletor[@deslocamento],..."] [--mobile]';
const { url, rest, flags } = readArgs(USAGE, {
  mobile: { type: 'boolean', default: false },
  'step-wait': { type: 'string', default: '1600' },
  'ready-timeout': { type: 'string', default: '30000' },
});
const [width = '1440', height = '900', folder, list = ''] = rest;
const out = outDir(`shots-${width}`, folder);

const browser = await launch();
const context = await browser.newContext({
  viewport: { width: Number(width), height: Number(height) },
  deviceScaleFactor: flags.mobile ? 2 : 1,
  isMobile: flags.mobile,
  hasTouch: flags.mobile,
});
const page = await context.newPage();
const logs = collectConsole(page);

await page.goto(url, { waitUntil: 'networkidle' });
const ready = await waitForExperience(page, Number(flags['ready-timeout']));
if (!ready) print('3D não ficou pronto (fallback em CSS)');
await page.waitForTimeout(1500);
print('classes do <html>:', await page.evaluate(() => document.documentElement.className));
await page.screenshot({ path: `${out}/00-top.png` });

const targets = list ? list.split(',') : [];
for (const [index, target] of targets.entries()) {
  const [selector, offset = '0'] = target.split('@');
  const found = await page.evaluate(
    ({ selector, offset }) => {
      const el = document.querySelector(selector);
      if (!el) return false;
      const top = el.getBoundingClientRect().top + window.scrollY + Number(offset) * window.innerHeight;
      window.scrollTo({ top, behavior: 'instant' });
      return true;
    },
    { selector, offset },
  );
  if (!found) {
    print('não achei', selector);
    continue;
  }
  await page.waitForTimeout(Number(flags['step-wait']));
  const name = `${String(index + 1).padStart(2, '0')}-${selector.replace(/[^a-z0-9]/gi, '')}`;
  await page.screenshot({ path: `${out}/${name}${offset === '0' ? '' : `-${offset}`}.png` });
}

print(logs.slice(0, 30).join('\n') || 'sem erros no console');
print('capturas em', out);
await browser.close();

// lista o que passa da largura da tela (scroll horizontal no celular); ignora quem está dentro de um pai que corta
// ou que rola na horizontal
// uso: node overflow.mjs <url> [--width=360] [--width=390]
import { launch } from './lib/browser.mjs';
import { print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node overflow.mjs <url> [--width=360] [--width=390]', {
  width: { type: 'string', multiple: true, default: ['360', '390'] },
});

const browser = await launch({ gpu: false });
let overflowing = 0;
for (const width of flags.width.map(Number)) {
  const page = await browser.newPage({
    viewport: { width, height: 844 },
    isMobile: true,
    deviceScaleFactor: 2,
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const result = await page.evaluate(() => {
    const viewport = document.documentElement.clientWidth;
    const clipped = (el) => {
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.body || parent === document.documentElement) return false;
        // quem corta também é quem rola (o trilho de deslizar das missões): o que passa dele não rola a página
        if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(parent).overflowX)) return true;
      }
      return false;
    };
    const items = new Set();
    for (const el of document.querySelectorAll('body *')) {
      const rect = el.getBoundingClientRect();
      // fora da tela pela esquerda de propósito (honeypot, sr-only antigo) não gera scroll
      if (rect.width === 0 || rect.right <= 0 || getComputedStyle(el).position === 'fixed') continue;
      if ((rect.right <= viewport + 1 && rect.left >= -1) || clipped(el)) continue;
      const classes =
        typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 2).join('.') : '';
      const section = el.closest('section, header, footer');
      const where = section ? section.id || section.tagName.toLowerCase() : '?';
      items.add(
        `${where} :: ${el.tagName.toLowerCase()}${classes ? `.${classes}` : ''} left=${Math.round(rect.left)} right=${Math.round(rect.right)}`,
      );
    }
    return { viewport, scrollWidth: document.documentElement.scrollWidth, items: [...items].slice(0, 25) };
  });
  const scrolls = result.scrollWidth > result.viewport;
  if (scrolls || result.items.length) overflowing++;
  print(
    `${width}px: largura ${result.viewport} | scrollWidth ${result.scrollWidth}${scrolls ? ' (ROLA NA HORIZONTAL)' : ''}`,
  );
  for (const item of result.items) print('  ', item);
  await page.close();
}
await browser.close();
process.exitCode = overflowing ? 1 : 0;

// clica nos links do header e nos CTAs e confere se o destino para logo abaixo do header.
// as seções com render adiado (content-visibility) não podem fazer o scroll errar o alvo.
// uso: node anchorcheck.mjs <url> [--tolerance=4]
import { DESKTOP, launch } from './lib/browser.mjs';
import { print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node anchorcheck.mjs <url> [--tolerance=4]', {
  tolerance: { type: 'string', default: '4' },
});
const tolerance = Number(flags.tolerance);

// [seletor do link, alvo]; no celular o nav do header fica no menu, então testa o CTA do hero e o nav do rodapé
const CASES = {
  desktop: [
    ['[data-registration-cta="header"]', '#inscricao'],
    ['.site-header a[href="#equipes"]', '#equipes'],
    ['.site-header a[href="#programacao"]', '#programacao'],
  ],
  mobile: [
    ['[data-registration-cta="hero"]', '#inscricao'],
    ['.site-footer a[href="#faq"]', '#faq'],
  ],
};
const VIEWPORTS = {
  desktop: DESKTOP,
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};

const browser = await launch();
let failures = 0;
for (const [device, options] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
  // a folga esperada é a mesma do scroll-padding-top do <html> (header + respiro)
  const expected = await page.evaluate(
    () => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0,
  );

  for (const [selector, target] of CASES[device]) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const link = await page.$(selector);
    if (!link) {
      failures++;
      print(device, 'sem elemento', selector);
      continue;
    }
    await link.evaluate((node) => node.click());
    await page.waitForTimeout(3500);
    const top = await page.evaluate(
      (t) => Math.round(document.querySelector(t).getBoundingClientRect().top),
      target,
    );
    const ok = Math.abs(top - expected) <= tolerance;
    if (!ok) failures++;
    print(
      ok ? 'ok  ' : 'ERRO',
      device.padEnd(7),
      selector.padEnd(42),
      '->',
      target.padEnd(13),
      `topo ${top} px (esperado ${expected})`,
    );
  }
  await context.close();
}
await browser.close();
print(failures ? `${failures} âncora(s) fora do alvo` : 'todas as âncoras no alvo');
process.exitCode = failures ? 1 : 0;

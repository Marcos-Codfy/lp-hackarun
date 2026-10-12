// clica nos links do header e nos CTAs e confere se o destino para logo abaixo do header.
// as seções com render adiado (content-visibility) não podem fazer o scroll errar o alvo, e quem chega de
// outra página (/equipes -> /#programacao) não pode cair fora do alvo quando o pin das missões abre espaço.
// uso: node anchorcheck.mjs <url> [--tolerance=4]
import { DESKTOP, launch } from './lib/browser.mjs';
import { print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node anchorcheck.mjs <url> [--tolerance=4]', {
  tolerance: { type: 'string', default: '4' },
});
const tolerance = Number(flags.tolerance);

// from = página onde o teste começa; click = link clicado (sem click = endereço com âncora aberto direto).
// No celular o nav do header fica no menu, então testa o CTA do hero e o nav do rodapé
const CASES = {
  desktop: [
    { from: '/', click: '[data-registration-cta="header"]', target: '#inscricao' },
    { from: '/', click: '.site-header a[href="#final"]', target: '#final' },
    { from: '/', click: '.site-header a[href="#programacao"]', target: '#programacao' },
    { from: '/equipes', click: '.site-header a[href="/#programacao"]', target: '#programacao' },
    { from: '/equipes', click: '.site-header a[href="/#inscricao"]', target: '#inscricao' },
    { from: '/#faq', target: '#faq' },
  ],
  mobile: [
    { from: '/', click: '[data-registration-cta="hero"]', target: '#inscricao' },
    { from: '/', click: '.site-footer a[href="#faq"]', target: '#faq' },
    { from: '/equipes', click: '.site-footer a[href="/#programacao"]', target: '#programacao' },
  ],
};
const VIEWPORTS = {
  desktop: DESKTOP,
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};

// folga esperada = scroll-padding-top do <html> (header + respiro)
const scrollPadding = (page) =>
  page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0);

async function open(page, path) {
  await page.goto(new URL(path, url).href, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
}

// devolve o topo do alvo em px, ou null se o link não existe
async function run(page, { from, click, target }) {
  await open(page, from);
  if (click) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const link = await page.$(click);
    if (!link) return null;
    const href = (await link.getAttribute('href')) ?? '';
    const press = link.evaluate((node) => node.click());
    // "/#secao" troca de página: espera a LP nova carregar antes de medir
    await (href.startsWith('#') ? press : Promise.all([page.waitForEvent('load'), press]));
  }
  await page.waitForTimeout(3500);
  return page.evaluate((t) => Math.round(document.querySelector(t).getBoundingClientRect().top), target);
}

const browser = await launch();
let failures = 0;
for (const [device, options] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  for (const step of CASES[device]) {
    const label = `${step.from} ${step.click ?? '(direto)'}`;
    const top = await run(page, step);
    if (top === null) {
      failures++;
      print('ERRO', device.padEnd(7), 'sem elemento', label);
      continue;
    }
    const expected = await scrollPadding(page);
    const ok = Math.abs(top - expected) <= tolerance;
    if (!ok) failures++;
    print(
      ok ? 'ok  ' : 'ERRO',
      device.padEnd(7),
      label.padEnd(52),
      '->',
      step.target.padEnd(13),
      `topo ${top} px (esperado ${expected})`,
    );
  }
  await context.close();
}
await browser.close();
print(failures ? `${failures} âncora(s) fora do alvo` : 'todas as âncoras no alvo');
process.exitCode = failures ? 1 : 0;

// clica nos links do header e nos CTAs e confere se o destino para logo abaixo do header.
// as seções com render adiado (content-visibility) não podem fazer o scroll errar o alvo, e quem chega de
// outra página (/equipes -> /#programacao) não pode cair fora do alvo quando o pin das missões abre espaço.
// Os CTAs de inscrição levam pra página /inscricao (confere o endereço com a origem) e o "Voltar ao evento" de
// quem chegou direto numa página leve cai no clímax (/#inscricao)
// uso: node anchorcheck.mjs <url> [--tolerance=4]
import { DESKTOP, launch } from './lib/browser.mjs';
import { print, readArgs } from './lib/cli.mjs';

const { url, flags } = readArgs('node anchorcheck.mjs <url> [--tolerance=4]', {
  tolerance: { type: 'string', default: '4' },
});
const tolerance = Number(flags.tolerance);

// from = página onde o teste começa; click = link clicado (sem click = endereço com âncora aberto direto);
// target = seção que tem de parar no lugar; page = endereço esperado depois do clique (CTA de inscrição).
// No celular o nav do header fica no menu, então testa o CTA do hero e o nav do rodapé
const CASES = {
  desktop: [
    { from: '/', click: '[data-registration-cta="header"]', page: '/inscricao?origem=header' },
    { from: '/', click: '.site-header a[href="#final"]', target: '#final' },
    { from: '/', click: '.site-header a[href="#programacao"]', target: '#programacao' },
    { from: '/equipes', click: '.site-header a[href="/#programacao"]', target: '#programacao' },
    { from: '/equipes', click: 'a[data-back-to-event]', target: '#inscricao' },
    { from: '/#faq', target: '#faq' },
  ],
  mobile: [
    { from: '/', click: '[data-registration-cta="hero"]', page: '/inscricao?origem=hero' },
    { from: '/', click: '.site-footer a[href="#faq"]', target: '#faq' },
    { from: '/equipes', click: '.site-footer a[href="/#programacao"]', target: '#programacao' },
    { from: '/inscricao', click: 'a[data-back-to-event]', target: '#inscricao' },
  ],
};
const VIEWPORTS = {
  desktop: DESKTOP,
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
};

// folga esperada = a do próprio alvo (data-anchor-offset: o palco do clímax para no topo) ou o
// scroll-padding-top do <html> (header + respiro)
const expectedTop = (page, target) =>
  page.evaluate((t) => {
    const own = document.querySelector(t)?.getAttribute('data-anchor-offset');
    if (own !== null && own !== undefined && own !== '') return Number(own);
    return parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  }, target);

async function open(page, path) {
  await page.goto(new URL(path, url).href, { waitUntil: 'load' });
  await page.waitForTimeout(2500);
}

// devolve o topo do alvo em px (ou o endereço de chegada, nos CTAs), ou null se o link não existe
async function run(page, { from, click, target }) {
  await open(page, from);
  if (click) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(800);
    const link = await page.$(click);
    if (!link) return null;
    const href = (await link.getAttribute('href')) ?? '';
    const press = link.evaluate((node) => node.click());
    // "/#secao" e "/inscricao" trocam de página: espera a nova carregar antes de medir
    await (href.startsWith('#') ? press : Promise.all([page.waitForEvent('load'), press]));
  }
  await page.waitForTimeout(3500);
  if (!target) {
    const here = new URL(page.url());
    return `${here.pathname}${here.search}`;
  }
  return page.evaluate((t) => {
    const el = document.querySelector(t);
    return el ? Math.round(el.getBoundingClientRect().top) : null;
  }, target);
}

const browser = await launch();
let failures = 0;
for (const [device, options] of Object.entries(VIEWPORTS)) {
  const context = await browser.newContext(options);
  for (const step of CASES[device]) {
    // aba nova a cada caso: o histórico limpo é o "chegou direto" (o "Voltar ao evento" volta no histórico
    // quando a LP já passou pela aba)
    const page = await context.newPage();
    const label = `${step.from} ${step.click ?? '(direto)'}`;
    const top = await run(page, step);
    const expected = top === null || step.page ? null : await expectedTop(page, step.target);
    await page.close();
    if (top === null) {
      failures++;
      print('ERRO', device.padEnd(7), 'sem elemento', label);
      continue;
    }
    if (step.page) {
      const ok = top === step.page;
      if (!ok) failures++;
      print(ok ? 'ok  ' : 'ERRO', device.padEnd(7), label.padEnd(52), '->', `${top} (esperado ${step.page})`);
      continue;
    }
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

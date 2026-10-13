// "← Voltar ao evento": quem veio da LP nesta aba volta no histórico (mesmo ponto da página); quem chegou
// direto, por link de fora ou de outra página do site, vai pro fim da LP (/#inscricao)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  BackToEventLinks,
  planBack,
  type HistoryEntryLike,
} from '@presentation/views/navigation/backToEvent';
import { CurrentPageLinks, isSamePageLink } from '@presentation/views/navigation/currentPageLinks';

const ORIGIN = 'https://hackarun.pages.dev';
const entry = (index: number, path: string): HistoryEntryLike => ({
  key: `k${index}`,
  index,
  url: `${ORIGIN}${path}`,
});

describe('planBack · referrer e tamanho do histórico', () => {
  it.each([
    ['veio da LP nesta aba', `${ORIGIN}/`, 2, 'back'],
    ['veio da LP com âncora e parâmetro', `${ORIGIN}/?quality=high#faq`, 3, 'back'],
    ['abriu /inscricao direto (sem referrer)', '', 1, 'navigate'],
    ['referrer da LP mas aba nova (histórico de 1)', `${ORIGIN}/`, 1, 'navigate'],
    ['veio de /equipes', `${ORIGIN}/equipes`, 2, 'navigate'],
    ['veio de outro site', 'https://instagram.com/', 2, 'navigate'],
    ['referrer quebrado', 'não é url', 2, 'navigate'],
  ])('%s → %s', (_label, referrer, historyLength, kind) => {
    expect(planBack({ referrer, origin: ORIGIN, historyLength }).kind).toBe(kind);
  });
});

describe('planBack · Navigation API (Chromium)', () => {
  it('LP duas páginas atrás (LP > inscrição > equipes): volta direto pra entrada da LP', () => {
    const entries = [entry(0, '/'), entry(1, '/inscricao?origem=hero'), entry(2, '/equipes')];
    const plan = planBack({
      referrer: `${ORIGIN}/inscricao`,
      origin: ORIGIN,
      historyLength: 3,
      entries,
      currentIndex: 2,
    });
    expect(plan).toEqual({ kind: 'traverse', key: 'k0' });
  });

  it('pega a entrada da LP mais recente antes da atual, nunca uma depois dela', () => {
    const entries = [
      entry(0, '/'),
      entry(1, '/inscricao'),
      entry(2, '/#faq'),
      entry(3, '/inscricao'),
      entry(4, '/'),
    ];
    const plan = planBack({ referrer: '', origin: ORIGIN, historyLength: 5, entries, currentIndex: 3 });
    expect(plan).toEqual({ kind: 'traverse', key: 'k2' });
  });

  it('sem a LP nas entradas desta aba: cai na regra do referrer', () => {
    const entries = [entry(0, '/equipes'), entry(1, '/inscricao')];
    expect(planBack({ referrer: '', origin: ORIGIN, historyLength: 2, entries, currentIndex: 1 }).kind).toBe(
      'navigate',
    );
  });
});

describe('BackToEventLinks · clique', () => {
  let back: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    document.body.innerHTML = '<a href="/#inscricao" data-back-to-event><span>Voltar ao evento</span></a>';
    back = vi.spyOn(history, 'back').mockImplementation(() => undefined);
    new BackToEventLinks().mount();
  });

  afterEach(() => {
    back.mockRestore();
    vi.restoreAllMocks();
    document.body.innerHTML = '';
  });

  const click = (init: MouseEventInit = {}) => {
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init });
    document.querySelector('span')?.dispatchEvent(event);
    return event;
  };

  it('veio da LP: volta no histórico em vez de abrir a LP de novo', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${location.origin}/`);
    vi.spyOn(history, 'length', 'get').mockReturnValue(3);
    const event = click();
    expect(event.defaultPrevented).toBe(true);
    expect(back).toHaveBeenCalledTimes(1);
  });

  it('chegou direto: o link segue pro /#inscricao', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue('');
    const event = click();
    expect(event.defaultPrevented).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });

  it('Ctrl/Cmd+clique (nova aba) fica com o navegador', () => {
    vi.spyOn(document, 'referrer', 'get').mockReturnValue(`${location.origin}/`);
    vi.spyOn(history, 'length', 'get').mockReturnValue(3);
    expect(click({ ctrlKey: true }).defaultPrevented).toBe(false);
    expect(back).not.toHaveBeenCalled();
  });
});

describe('link da própria página (aria-current="page")', () => {
  afterEach(() => {
    document.body.innerHTML = '';
    vi.restoreAllMocks();
  });

  it('só conta a própria página, sem âncora e sem nova aba', () => {
    history.replaceState(null, '', '/inscricao');
    const link = (attrs: string) => {
      document.body.innerHTML = `<a ${attrs}>x</a>`;
      return document.querySelector('a') as HTMLAnchorElement;
    };
    expect(isSamePageLink(link('href="/inscricao" aria-current="page"'))).toBe(true);
    expect(isSamePageLink(link('href="/inscricao"'))).toBe(false);
    expect(isSamePageLink(link('href="/equipes" aria-current="page"'))).toBe(false);
    expect(isSamePageLink(link('href="/inscricao#reg-step-02" aria-current="page"'))).toBe(false);
    expect(isSamePageLink(link('href="/inscricao" aria-current="page" target="_blank"'))).toBe(false);
    history.replaceState(null, '', '/inscricao/');
    expect(isSamePageLink(link('href="/inscricao" aria-current="page"'))).toBe(true);
  });

  it('clique sobe pro topo em vez de recarregar (o que foi digitado fica) e o foco vai pro começo do conteúdo', () => {
    history.replaceState(null, '', '/inscricao');
    document.body.innerHTML =
      '<main id="conteudo"><h1>Inscrição</h1></main><footer><a href="/inscricao" aria-current="page">Inscrição</a></footer>';
    const scroll = vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
    new CurrentPageLinks(true).mount();
    const link = document.querySelector<HTMLAnchorElement>('footer a') as HTMLAnchorElement;
    link.focus();
    const event = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(scroll).toHaveBeenCalledWith({ top: 0, behavior: 'instant' });
    // o próximo Tab segue do topo, não do rodapé
    expect(document.activeElement?.id).toBe('conteudo');
    expect(document.getElementById('conteudo')?.getAttribute('tabindex')).toBe('-1');
  });
});

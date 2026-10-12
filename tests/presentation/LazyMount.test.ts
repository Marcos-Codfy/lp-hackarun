// chunk de uma parte da página: baixa uma vez, só quando a seção importa (perto, salto, foco ou CTA)
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { LazyMount } from '@presentation/app/LazyMount';

type Callback = (entries: Partial<IntersectionObserverEntry>[]) => void;

class FakeObserver {
  static last: FakeObserver | null = null;
  readonly observed = new Set<Element>();
  readonly margin: string | undefined;

  constructor(
    private readonly callback: Callback,
    options?: IntersectionObserverInit,
  ) {
    this.margin = options?.rootMargin;
    FakeObserver.last = this;
  }

  observe(el: Element): void {
    this.observed.add(el);
  }

  disconnect(): void {
    this.observed.clear();
  }

  near(target: Element): void {
    this.callback([{ target, isIntersecting: true }]);
  }
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

function section(id = 'inscricao'): HTMLElement {
  document.body.innerHTML = `<a href="#${id}" data-link>Inscrição</a><a href="#faq" data-other>FAQ</a>
    <section id="${id}"><input data-field /></section>`;
  return document.getElementById(id) as HTMLElement;
}

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
  FakeObserver.last = null;
  history.replaceState(null, '', location.pathname);
});

describe('LazyMount', () => {
  it('não baixa nada até a seção chegar perto (com folga de telas) e baixa uma vez só', async () => {
    const target = section();
    const load = vi.fn(async () => undefined);
    const lazy = new LazyMount(target, load);

    lazy.watch();
    expect(load).not.toHaveBeenCalled();
    expect(FakeObserver.last?.margin).toContain('200%');

    FakeObserver.last?.near(target);
    FakeObserver.last?.near(target);
    await flush();

    expect(load).toHaveBeenCalledTimes(1);
    expect(lazy.loaded).toBe(true);
    expect(FakeObserver.last?.observed.size).toBe(0);
  });

  it('CTA (trigger) e ensure dividem o mesmo carregamento', async () => {
    const load = vi.fn(async () => undefined);
    const lazy = new LazyMount(section(), load);

    lazy.trigger();
    await lazy.ensure();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('clique num link pro #id começa a baixar já no clique; link pra outra seção não', async () => {
    const load = vi.fn(async () => undefined);
    new LazyMount(section(), load).watch();

    document.querySelector<HTMLElement>('[data-other]')?.click();
    expect(load).not.toHaveBeenCalled();

    document.querySelector<HTMLElement>('[data-link]')?.click();
    expect(load).toHaveBeenCalledTimes(1);
  });

  it('foco ou toque dentro da seção antes do chunk chegar: baixa na hora', () => {
    const target = section();
    const load = vi.fn(async () => undefined);
    new LazyMount(target, load).watch();

    target.querySelector('input')?.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('página aberta no hash da seção (/#inscricao): baixa no boot', () => {
    history.replaceState(null, '', '#inscricao');
    const load = vi.fn(async () => undefined);

    new LazyMount(section(), load).watch();

    expect(load).toHaveBeenCalledTimes(1);
  });

  it('carregamento que falhou tenta de novo no próximo gatilho', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce(undefined);
    const lazy = new LazyMount(section(), load);

    lazy.trigger();
    await flush();
    expect(error).toHaveBeenCalledWith('[lazy] mount failed', expect.any(Error));
    expect(lazy.loaded).toBe(false);

    await lazy.ensure();
    expect(load).toHaveBeenCalledTimes(2);
    expect(lazy.loaded).toBe(true);
    error.mockRestore();
  });

  it('sem IntersectionObserver: baixa na hora (o conteúdo não pode ficar sem JS)', () => {
    vi.stubGlobal('IntersectionObserver', undefined);
    Reflect.deleteProperty(window, 'IntersectionObserver');
    const load = vi.fn(async () => undefined);

    new LazyMount(section(), load).watch();

    expect(load).toHaveBeenCalledTimes(1);
  });
});

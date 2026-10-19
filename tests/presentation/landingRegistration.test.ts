// a LP não tem mais formulário (ele mora em /inscricao): o boot da LP não baixa o envio, a vitrine de equipes
// (fora da LP até o sorteio) só carrega sob demanda quando existe e o clímax ainda acende o CTA, que é só um
// link pra página de inscrição
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import { Observable } from '@shared/core/Observable';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import { createClientContainer } from '@composition/client';
import type { AppConfig } from '@presentation/app/AppConfig';
import type { AppContext } from '@presentation/app/AppContext';
import type { AppEvents } from '@presentation/app/AppEvents';

const mocks = vi.hoisted(() => ({ mountTeams: vi.fn(), loadRegistration: vi.fn() }));

vi.mock('@presentation/views/teams/mountTeams', () => ({ mountTeams: mocks.mountTeams }));

const SLOTS = { capacity: null, taken: 0, remaining: null, level: 'unknown' as const };
const CONFIG: AppConfig = {
  milestones: [],
  registration: {
    status: 'open',
    endpoint: null,
    closesAt: null,
    slots: SLOTS,
    teamSize: { min: 4, max: 5 },
  },
  teamsEndpoint: null,
};

class FakeObserver {
  static all: FakeObserver[] = [];
  readonly observed: Element[] = [];

  constructor(
    private readonly callback: (entries: Partial<IntersectionObserverEntry>[]) => void,
    readonly options: IntersectionObserverInit = {},
  ) {
    FakeObserver.all.push(this);
  }

  observe(el: Element): void {
    this.observed.push(el);
  }

  disconnect(): void {}

  unobserve(): void {}

  near(target: Element): void {
    this.callback([{ target, isIntersecting: true }]);
  }
}

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

async function boot(): Promise<AppContext> {
  vi.resetModules();
  vi.doMock('@composition/client', () => ({
    createClientContainer: () => ({
      clock: { now: () => new Date('2026-10-12T12:00:00Z') },
      getCountdown: {},
      loadRegistration: mocks.loadRegistration,
      listTeams: null,
      preferences: new MemoryPreferenceStore(),
    }),
  }));
  const { mountViews } = await import('@presentation/views/mountViews');
  const ctx = {
    bus: new EventBus<AppEvents>(),
    config: CONFIG,
    reducedMotion: false,
    coarsePointer: false,
    motion: { scrollTo: vi.fn(), stop: vi.fn(), start: vi.fn() },
    scenes: { keys: [], progress: new Observable(0), velocity: new Observable(0) },
  } as unknown as AppContext;
  const steps: (() => void)[] = [];
  mountViews(ctx, { add: (_name, run) => steps.push(run) });
  steps.forEach((run) => run());
  return ctx;
}

// o do LazyMount (folga de telas); o ChargeRevealView também observa a seção final
const lazyObserverOf = (el: Element | null): FakeObserver | undefined =>
  FakeObserver.all.find((o) => el !== null && o.observed.includes(el) && Boolean(o.options.rootMargin));

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  document.body.innerHTML = `
    <section id="equipes"><div data-teams data-teams-initial="[]"></div></section>
    <section id="inscricao" data-scene-hold="900">
      <div data-charge-reveal><a href="/inscricao?origem=final" data-registration-cta="final">Inscrever</a></div>
    </section>`;
  mocks.mountTeams.mockReturnValue([]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('@composition/client');
  FakeObserver.all = [];
  vi.clearAllMocks();
});

describe('LP sem formulário', () => {
  it('o boot e a seção final chegando perto não baixam o envio', async () => {
    await boot();
    const section = document.getElementById('inscricao') as HTMLElement;
    expect(lazyObserverOf(section)).toBeUndefined();
    section.dispatchEvent(new FocusEvent('focusin', { bubbles: true }));
    await flush();
    expect(mocks.loadRegistration).not.toHaveBeenCalled();
  });

  it('o clique no CTA final segue o link (nada intercepta pra rolar até um formulário)', async () => {
    await boot();
    const link = document.querySelector<HTMLAnchorElement>(
      '[data-registration-cta="final"]',
    ) as HTMLAnchorElement;
    const click = new MouseEvent('click', { bubbles: true, cancelable: true, button: 0 });
    link.dispatchEvent(click);
    expect(click.defaultPrevented).toBe(false);
  });

  it('o clímax continua: a seção final espera a carga do globo pra acender o CTA', async () => {
    const ctx = await boot();
    const section = document.getElementById('inscricao') as HTMLElement;
    expect(section.classList.contains('is-awaiting-charge')).toBe(true);
    ctx.bus.emit('experience:charged', undefined);
    expect(section.classList.contains('is-charged')).toBe(true);
  });

  it('LP de agora (seção do sorteio, sem [data-teams]): nenhum chunk de equipes nem observador', async () => {
    document.getElementById('equipes')?.replaceChildren();
    await boot();
    const section = document.getElementById('equipes') as HTMLElement;
    expect(lazyObserverOf(section)).toBeUndefined();
    await flush();
    expect(mocks.mountTeams).not.toHaveBeenCalled();
  });

  it('quando a vitrine de equipes voltar ([data-teams]), ela carrega sob demanda, uma vez só', async () => {
    await boot();
    const section = document.getElementById('equipes') as HTMLElement;
    expect(mocks.mountTeams).not.toHaveBeenCalled();
    lazyObserverOf(section)?.near(section);
    lazyObserverOf(section)?.near(section);
    await vi.waitFor(() => expect(mocks.mountTeams).toHaveBeenCalledTimes(1));
  });
});

describe('createClientContainer: inscrição em chunk à parte', () => {
  it('loadRegistration entrega o envio e reaproveita o mesmo carregamento', async () => {
    const container = createClientContainer(CONFIG, { simulation: false });

    const first = container.loadRegistration();
    const services = await first;

    expect(container.loadRegistration()).toBe(first);
    expect(typeof services.submitRegistration.execute).toBe('function');
    // sem planilha e sem simulação, ninguém conta as vagas
    expect(services.counter).toBeNull();
  });
});

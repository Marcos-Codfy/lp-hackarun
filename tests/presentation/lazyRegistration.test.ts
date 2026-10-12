// o formulário de inscrição (o maior pedaço do JS) não entra no boot: chunk à parte, carregado quando a
// seção chega perto ou um CTA leva até lá, com a origem do CTA e as vagas ao vivo das equipes
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import { Observable } from '@shared/core/Observable';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import { createClientContainer } from '@composition/client';
import type { AppConfig } from '@presentation/app/AppConfig';
import type { AppContext } from '@presentation/app/AppContext';
import type { AppEvents } from '@presentation/app/AppEvents';

const mocks = vi.hoisted(() => ({
  mountRegistrationForm: vi.fn(),
  mountTeams: vi.fn(),
  loadRegistration: vi.fn(),
}));

vi.mock('@presentation/views/registration/mountRegistrationForm', () => ({
  mountRegistrationForm: mocks.mountRegistrationForm,
}));
vi.mock('@presentation/views/teams/mountTeams', () => ({ mountTeams: mocks.mountTeams }));

const SLOTS = { capacity: null, taken: 0, remaining: null, level: 'unknown' as const };
const CONFIG: AppConfig = {
  milestones: [],
  registration: {
    status: 'open',
    endpoint: null,
    closesAt: null,
    slots: SLOTS,
    teamSize: { min: 2, max: 5 },
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

// o do LazyMount (folga de telas); o ChargeRevealView também observa a seção
const lazyObserverOf = (el: Element | null): FakeObserver | undefined =>
  FakeObserver.all.find((o) => el !== null && o.observed.includes(el) && Boolean(o.options.rootMargin));

beforeEach(() => {
  vi.stubGlobal('IntersectionObserver', FakeObserver);
  document.body.innerHTML = `
    <section id="equipes"><div data-teams data-teams-initial="[]"></div></section>
    <section id="inscricao"><div data-registration-form data-status="open"></div></section>`;
  mocks.loadRegistration.mockResolvedValue({ submitRegistration: {}, prepareTeamImage: {} });
  mocks.mountRegistrationForm.mockReturnValue({ focusEntry: () => true });
  mocks.mountTeams.mockReturnValue([{ id: 'teams-vm' }]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.doUnmock('@composition/client');
  FakeObserver.all = [];
  vi.clearAllMocks();
});

describe('formulário de inscrição sob demanda', () => {
  it('no boot não baixa o formulário nem a lista de equipes', async () => {
    await boot();
    await flush();

    expect(mocks.loadRegistration).not.toHaveBeenCalled();
    expect(mocks.mountRegistrationForm).not.toHaveBeenCalled();
    expect(mocks.mountTeams).not.toHaveBeenCalled();
  });

  it('CTA clicado: carrega na hora, com a origem do CTA e o VM das equipes (vagas ao vivo)', async () => {
    const ctx = await boot();

    ctx.bus.emit('registration:intent', { source: 'hero' });
    await vi.waitFor(() => expect(mocks.mountRegistrationForm).toHaveBeenCalledTimes(1));

    expect(mocks.loadRegistration).toHaveBeenCalledTimes(1);
    expect(mocks.mountTeams).toHaveBeenCalledTimes(1);
    expect(mocks.mountRegistrationForm).toHaveBeenCalledWith(
      expect.objectContaining({ source: 'hero', teams: { id: 'teams-vm' } }),
    );
  });

  it('seção chegando perto monta uma vez só', async () => {
    await boot();
    const section = document.getElementById('inscricao');

    lazyObserverOf(section)?.near(section as Element);
    lazyObserverOf(section)?.near(section as Element);
    await vi.waitFor(() => expect(mocks.mountRegistrationForm).toHaveBeenCalledTimes(1));
    await flush();

    expect(mocks.mountRegistrationForm).toHaveBeenCalledTimes(1);
    expect(mocks.mountRegistrationForm).toHaveBeenCalledWith(expect.objectContaining({ source: null }));
  });
});

describe('createClientContainer: inscrição em chunk à parte', () => {
  it('loadRegistration entrega envio e foto, e reaproveita o mesmo carregamento', async () => {
    const container = createClientContainer(CONFIG, { dev: false });

    const first = container.loadRegistration();
    const services = await first;

    expect(container.loadRegistration()).toBe(first);
    expect(typeof services.submitRegistration.execute).toBe('function');
    expect(typeof services.prepareTeamImage.execute).toBe('function');
  });
});

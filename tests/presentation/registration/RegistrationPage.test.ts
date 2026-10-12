// a página /inscricao montada inteira (mountRegistrationPage): com teto de vagas, a lista ao vivo da planilha
// fecha o formulário quando as vagas acabam e o selo do topo vira "Encerradas"; sem teto, nem busca a lista.
// Enviada, o painel de apoio (lista e etapas) sai
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ok, Team, type TeamRepository } from '@domain/index';
import { ListTeams, SubmitRegistration, type RegistrationDTO, type SlotsDTO } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { mountRegistrationPage } from '@presentation/views/registration/mountRegistrationPage';
import { FakeGateway, ManualClock, MILESTONES, TEAM_SIZE, teamName } from '../../helpers/fixtures';
import { preparedImage } from '../../helpers/images';
import { formMarkup } from './formMarkup';
import { fillValidTeam } from './formSetup';

const PAGE = (form: string) => `
  <div data-reg-status data-state="open">
    <span data-reg-status-badge>Abertas</span>
    <div data-reg-status-countdown></div>
  </div>
  <aside data-reg-aside>
    <div data-form-progress><span data-step-done>0</span></div>
  </aside>
  ${form}`;

const CLOSES_AT = '2026-11-08T23:59:00-03:00';

type PrepareImage = Parameters<typeof mountRegistrationPage>[0]['services']['prepareTeamImage'];

function teams(count: number): TeamRepository {
  const list = Array.from({ length: count }, (_, i) =>
    Team.create({ id: String(i), name: teamName(`Equipe ${i + 1}`), memberCount: 3, status: 'confirmed' }),
  );
  return { list: vi.fn(async () => list) };
}

function mount(options: { capacity: number | null; confirmed: number }) {
  document.body.innerHTML = PAGE(formMarkup());
  const clock = new ManualClock('2026-11-01T12:00:00Z');
  const slots: SlotsDTO = {
    capacity: options.capacity,
    taken: 0,
    remaining: options.capacity,
    level: options.capacity === null ? 'unknown' : 'plenty',
  };
  const registration: RegistrationDTO = {
    status: 'open',
    endpoint: 'https://script.google.com/macros/s/abc/exec',
    closesAt: CLOSES_AT,
    slots,
    teamSize: TEAM_SIZE,
  };
  const gateway = new FakeGateway();
  const submitRegistration = new SubmitRegistration({
    gateway,
    clock,
    teamSize: TEAM_SIZE,
    sleep: async (ms: number) => clock.advance(ms),
    window: { endpoint: registration.endpoint, closesAt: CLOSES_AT, slots },
  });
  const repo = teams(options.confirmed);
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  const vm = mountRegistrationPage({
    root,
    config: { milestones: MILESTONES, registration, teamsEndpoint: registration.endpoint },
    bus: new EventBus<AppEvents>(),
    services: {
      submitRegistration,
      // só o execute é usado pelo VM (o resto da classe é o preparo de verdade, no navegador)
      prepareTeamImage: { execute: vi.fn(async () => ok(preparedImage())) } as unknown as PrepareImage,
    },
    container: { clock, listTeams: new ListTeams(repo) },
    reducedMotion: true,
  });
  const el = (selector: string) => document.querySelector<HTMLElement>(selector);
  return { vm, repo, el, gateway };
}

beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mountRegistrationPage', () => {
  it('vagas esgotadas na lista ao vivo: o formulário fecha e o selo vira "Encerradas", sem o contador', async () => {
    const { vm, repo, el } = mount({ capacity: 3, confirmed: 3 });
    expect(vm.isOpen).toBe(true);
    await vi.waitFor(() => expect(vm.isOpen).toBe(false));
    expect(repo.list).toHaveBeenCalledTimes(1);
    expect(el('[data-reg-closed]')?.hidden).toBe(false);
    expect(el('[data-reg-panel]')?.hidden).toBe(true);
    expect(el('[data-reg-status]')?.dataset['state']).toBe('closed');
    expect(el('[data-reg-status-badge]')?.textContent).toBe('Encerradas');
    expect(el('[data-reg-status-countdown]')?.hidden).toBe(true);
  });

  it('ainda cabe equipe: segue aberto e o selo não muda', async () => {
    const { vm, repo, el } = mount({ capacity: 3, confirmed: 2 });
    await vi.waitFor(() => expect(repo.list).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(vm.isOpen).toBe(true);
    expect(el('[data-reg-status]')?.dataset['state']).toBe('open');
  });

  it('sem teto de vagas: nem busca a lista da planilha', async () => {
    const { vm, repo } = mount({ capacity: null, confirmed: 50 });
    await Promise.resolve();
    expect(repo.list).not.toHaveBeenCalled();
    expect(vm.isOpen).toBe(true);
  });

  it('inscrição enviada: o painel de apoio (lista e etapas) some', async () => {
    const { vm, el } = mount({ capacity: null, confirmed: 0 });
    expect(el('[data-reg-aside]')?.hidden).toBe(false);
    fillValidTeam(vm);
    await vm.submit();
    expect(vm.state.value.status).toBe('success');
    expect(el('[data-reg-aside]')?.hidden).toBe(true);
  });
});

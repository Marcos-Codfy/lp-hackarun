// a página /inscricao montada inteira (mountRegistrationPage): com teto de vagas, a contagem da planilha fecha o
// formulário quando as vagas acabam e o selo do topo vira "Encerradas"; sem teto, nem pergunta.
// Enviada, o painel de apoio (lista e etapas) sai
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  SubmitRegistration,
  type RegistrationCounter,
  type RegistrationDTO,
  type SlotsDTO,
} from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { mountRegistrationPage } from '@presentation/views/registration/mountRegistrationPage';
import { FakeGateway, ManualClock, MILESTONES, TEAM_SIZE } from '../../helpers/fixtures';
import { formMarkup } from './formMarkup';
import { fillValid } from './formSetup';

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

// contagem da planilha (null = não deu pra saber)
const counterOf = (taken: number | null) =>
  ({ taken: vi.fn(async () => taken) }) satisfies RegistrationCounter;

function mount(options: { capacity: number | null; taken: number | null }) {
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
  const counter = counterOf(options.taken);
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  const vm = mountRegistrationPage({
    root,
    config: { milestones: MILESTONES, registration, teamsEndpoint: registration.endpoint },
    bus: new EventBus<AppEvents>(),
    services: { submitRegistration, counter },
    container: { clock },
    reducedMotion: true,
  });
  const el = (selector: string) => document.querySelector<HTMLElement>(selector);
  return { vm, counter, el, gateway };
}

beforeEach(() => {
  sessionStorage.clear();
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  document.body.innerHTML = '';
});

describe('mountRegistrationPage', () => {
  it('vagas esgotadas na contagem da planilha: o formulário fecha e o selo vira "Encerradas", sem o contador', async () => {
    const { vm, counter, el } = mount({ capacity: 75, taken: 75 });
    expect(vm.isOpen).toBe(true);
    await vi.waitFor(() => expect(vm.isOpen).toBe(false));
    expect(counter.taken).toHaveBeenCalledTimes(1);
    expect(el('[data-reg-closed]')?.hidden).toBe(false);
    expect(el('[data-reg-panel]')?.hidden).toBe(true);
    expect(el('[data-reg-status]')?.dataset['state']).toBe('closed');
    expect(el('[data-reg-status-badge]')?.textContent).toBe('Encerradas');
    expect(el('[data-reg-status-countdown]')?.hidden).toBe(true);
  });

  it('ainda cabe gente: segue aberto e o selo não muda', async () => {
    const { vm, counter, el } = mount({ capacity: 75, taken: 74 });
    await vi.waitFor(() => expect(counter.taken).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(vm.isOpen).toBe(true);
    expect(el('[data-reg-status]')?.dataset['state']).toBe('open');
  });

  it('contagem indisponível (null): fica o que o build disse', async () => {
    const { vm, counter } = mount({ capacity: 75, taken: null });
    await vi.waitFor(() => expect(counter.taken).toHaveBeenCalledTimes(1));
    await Promise.resolve();
    expect(vm.isOpen).toBe(true);
  });

  it('sem teto de vagas: nem pergunta pra planilha', async () => {
    const { vm, counter } = mount({ capacity: null, taken: 500 });
    await Promise.resolve();
    expect(counter.taken).not.toHaveBeenCalled();
    expect(vm.isOpen).toBe(true);
  });

  it('inscrição enviada: o painel de apoio (lista e etapas) some', async () => {
    const { vm, el } = mount({ capacity: null, taken: 0 });
    expect(el('[data-reg-aside]')?.hidden).toBe(false);
    fillValid(vm);
    await vm.submit();
    expect(vm.state.value.status).toBe('success');
    expect(el('[data-reg-aside]')?.hidden).toBe(true);
  });
});

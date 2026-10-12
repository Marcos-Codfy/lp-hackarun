// rascunho na tela: quem volta pra /inscricao acha o que digitou (cards extras, foto pronta, aceite desmarcado),
// a faixa avisa, "Limpar rascunho" zera tudo (menos com o envio em andamento) e o envio que entra apaga o
// rascunho. A chave do envio volta com ele: resposta perdida + recarregar não vira um envio novo
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationReceipt } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { DRAFT_KEY, RegistrationDraft } from '@presentation/view-models/registration/RegistrationDraft';
import { emptyFields } from '@presentation/view-models/registration/RegistrationFields';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { DraftKeeper } from '@presentation/views/registration/DraftKeeper';
import { preparedImage } from '../../helpers/images';
import { formMarkup } from './formMarkup';
import { fillMember, fillValidTeam, setupForm } from './formSetup';

const BAR = `
  <div data-draft hidden>
    <p><span data-draft-text></span><span data-draft-note hidden></span></p>
    <button type="button" data-draft-clear>Limpar rascunho</button>
  </div>`;

const SAVED = {
  v: 2,
  teamName: 'Bug Busters',
  members: [
    { name: 'Ana Souza', studentId: '2024100123', email: 'ana@exemplo.com' },
    { name: 'Bruno Lima', studentId: '', email: '' },
    { name: 'Carla Dias', studentId: '', email: 'carla@exemplo.com' },
  ],
  // a foto mora na chave ao lado (DRAFT_KEY:image)
  image: true,
  source: 'hero',
};

const LOST_KEY = '6b1f0c2e-9a7d-4c3b-8e5f-1d2c3b4a5f60';

function mount(options: { saved?: unknown; source?: string; before?: (root: HTMLElement) => void } = {}) {
  document.body.innerHTML = formMarkup(BAR);
  if (options.saved) {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(options.saved));
    sessionStorage.setItem(`${DRAFT_KEY}:image`, JSON.stringify(preparedImage()));
  }
  const form = setupForm();
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  options.before?.(root);
  const bar = document.querySelector<HTMLElement>('[data-draft]');
  const keeper = new DraftKeeper({
    root,
    vm: form.vm,
    draft: new RegistrationDraft(sessionStorage),
    bar,
    source: options.source ?? 'direct',
  });
  keeper.restore();
  new RegistrationFormView(root, form.vm, new EventBus<AppEvents>(), vi.fn()).mount();
  keeper.mount();
  const value = (selector: string) => root.querySelector<HTMLInputElement>(selector)?.value;
  const rows = () => root.querySelectorAll('[data-member-row]');
  return { ...form, root, bar: bar as HTMLElement, value, rows };
}

const stored = () =>
  JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as Record<string, unknown> | null;

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('DraftKeeper · volta pra página', () => {
  it('devolve campos, cards extras e a foto; o aceite volta desmarcado e a faixa avisa', () => {
    const { vm, value, rows, bar, root } = mount({ saved: SAVED });
    expect(rows()).toHaveLength(3);
    expect(value('#reg-team-name')).toBe('Bug Busters');
    expect(value('#member-0-studentId')).toBe('2024100123');
    expect(rows()[2]?.querySelector<HTMLInputElement>('[data-member-field="email"]')?.value).toBe(
      'carla@exemplo.com',
    );
    expect(vm.fields.teamImage).toEqual(preparedImage());
    expect(vm.fields.acceptedTerms).toBe(false);
    expect(root.querySelector<HTMLInputElement>('#reg-terms')?.checked).toBe(false);
    expect(bar.hidden).toBe(false);
    expect(bar.textContent).toContain('Rascunho recuperado');
    expect(root.querySelector('[data-reg-live]')?.textContent).toBe('Rascunho recuperado.');
  });

  it('o que a pessoa já digitou nesta visita (antes do JS) ganha do rascunho', () => {
    const { vm, value } = mount({
      saved: SAVED,
      before: (root) => {
        const team = root.querySelector<HTMLInputElement>('#reg-team-name');
        if (team) team.value = 'Cerrado Devs';
      },
    });
    expect(value('#reg-team-name')).toBe('Cerrado Devs');
    expect(vm.fields.teamName).toBe('Cerrado Devs');
    expect(vm.fields.members[0]?.name).toBe('Ana Souza');
  });

  it('foto que não coube no rascunho: pede pra escolher de novo', () => {
    const { bar, vm } = mount({ saved: { ...SAVED, image: false, imageDropped: true } });
    expect(vm.fields.teamImage).toBeNull();
    expect(bar.querySelector<HTMLElement>('[data-draft-note]')?.hidden).toBe(false);
    expect(bar.textContent).toContain('escolha de novo');
  });

  it('sem origem no endereço, vale a do rascunho; com origem, a do endereço', async () => {
    const restored = mount({ saved: SAVED });
    fillValidTeam(restored.vm);
    fillMember(restored.vm, 2);
    vi.useRealTimers();
    await restored.vm.submit();
    expect(restored.gateway.calls[0]?.source).toBe('hero');

    vi.useFakeTimers();
    const fresh = mount({ saved: SAVED, source: 'faq' });
    fillValidTeam(fresh.vm);
    fillMember(fresh.vm, 2);
    vi.useRealTimers();
    await fresh.vm.submit();
    expect(fresh.gateway.calls[0]?.source).toBe('faq');
  });
});

describe('DraftKeeper · enquanto preenche', () => {
  it('salva depois de uma pausa na digitação e marca "Rascunho salvo nesta aba"', () => {
    const { vm, bar } = mount({ source: 'final' });
    vm.setText('teamName', 'Bug Busters');
    expect(stored()).toBeNull();
    vi.advanceTimersByTime(450);
    expect(stored()).toMatchObject({ teamName: 'Bug Busters', source: 'final', sessionKey: 'chave-0001' });
    expect(bar.hidden).toBe(false);
    expect(bar.textContent).toContain('Rascunho salvo nesta aba');
  });

  it('saindo da página (pagehide) grava na hora', () => {
    const { vm } = mount();
    vm.setText('members.0.name', 'Ana Souza');
    window.dispatchEvent(new Event('pagehide'));
    expect((stored()?.['members'] as { name: string }[])[0]?.name).toBe('Ana Souza');
  });

  it('"Limpar rascunho" apaga o salvo, zera campos e cards e leva o foco pro nome da equipe', () => {
    const { vm, value, rows, bar, root } = mount({ saved: SAVED });
    bar.querySelector<HTMLButtonElement>('[data-draft-clear]')?.click();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(vm.fields).toEqual(emptyFields(2));
    expect(rows()).toHaveLength(2);
    expect(value('#reg-team-name')).toBe('');
    expect(value('#member-0-name')).toBe('');
    expect(document.activeElement?.id).toBe('reg-team-name');
    expect(bar.hidden).toBe(true);
    expect(root.querySelector('[data-reg-live]')?.textContent).toContain('Rascunho apagado');
  });

  it('pagehide e visibilitychange juntos gravam uma vez só (e nada sem mudança)', () => {
    const { vm } = mount();
    const write = vi.spyOn(sessionStorage, 'setItem');
    vm.setText('teamName', 'Bug Busters');
    window.dispatchEvent(new Event('pagehide'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(write.mock.calls.filter(([key]) => key === DRAFT_KEY)).toHaveLength(1);
    write.mockRestore();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('"Limpar rascunho" com o envio em andamento: o botão desliga e nada é apagado', async () => {
    const { vm, gateway, bar, value } = mount({ saved: SAVED });
    fillValidTeam(vm);
    fillMember(vm, 2);
    let answer: (receipt: RegistrationReceipt) => void = () => undefined;
    vi.spyOn(gateway, 'submit').mockImplementation((payload) => {
      gateway.calls.push(payload);
      return new Promise((resolve) => (answer = resolve));
    });
    vi.useRealTimers();
    const sending = vm.submit();
    await vi.waitFor(() => expect(gateway.calls).toHaveLength(1));
    const clear = bar.querySelector<HTMLButtonElement>('[data-draft-clear]') as HTMLButtonElement;
    expect(clear.disabled).toBe(true);
    // mesmo que o clique chegue (botão religado à força), o formulário na tela continua o que está indo
    clear.disabled = false;
    clear.click();
    expect(value('#reg-team-name')).toBe('Bug Busters');
    expect(vm.fields.teamName).toBe('Bug Busters');
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    answer({ protocol: 'HR26-OK0001' });
    await sending;
    expect(vm.state.value.status).toBe('success');
  });

  it('resposta perdida + recarregar: o rascunho devolve a chave e o reenvio é o mesmo envio', async () => {
    const { vm, gateway } = mount({ saved: { ...SAVED, sessionKey: LOST_KEY } });
    fillValidTeam(vm);
    fillMember(vm, 2);
    vi.useRealTimers();
    await vm.submit();
    expect(gateway.calls[0]?.idempotencyKey).toBe(LOST_KEY);
  });

  it('inscrição enviada: o rascunho some e nada mais é salvo', async () => {
    const { vm } = mount({ saved: SAVED });
    fillValidTeam(vm);
    fillMember(vm, 2);
    vi.advanceTimersByTime(450);
    expect(stored()).not.toBeNull();
    vi.useRealTimers();
    await vm.submit();
    expect(vm.state.value.status).toBe('success');
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    window.dispatchEvent(new Event('pagehide'));
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
  });
});

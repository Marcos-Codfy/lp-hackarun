// rascunho na tela: quem volta pra /inscricao acha o que digitou (aceite desmarcado), a faixa avisa, "Limpar
// rascunho" zera tudo (menos com o envio em andamento) e o envio que entra apaga o rascunho. A chave do envio
// volta com ele: resposta perdida + recarregar não vira um envio novo
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationReceipt } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { DRAFT_KEY, RegistrationDraft } from '@presentation/view-models/registration/RegistrationDraft';
import { emptyFields } from '@presentation/view-models/registration/RegistrationFields';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { DraftKeeper } from '@presentation/views/registration/DraftKeeper';
import { formMarkup } from './formMarkup';
import { fillValid, setupForm } from './formSetup';

const BAR = `
  <div data-draft hidden>
    <p><span data-draft-text></span></p>
    <button type="button" data-draft-clear>Limpar rascunho</button>
  </div>`;

const SAVED = {
  v: 3,
  fields: {
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    adult: 'no',
    profile: 'other-institution',
    institution: 'Faculdade Exemplo',
    period: '2',
  },
  source: 'hero',
};

const LOST_KEY = '6b1f0c2e-9a7d-4c3b-8e5f-1d2c3b4a5f60';

function mount(options: { saved?: unknown; source?: string; before?: (root: HTMLElement) => void } = {}) {
  document.body.innerHTML = formMarkup(BAR);
  if (options.saved) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(options.saved));
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
  const input = <T extends HTMLInputElement | HTMLSelectElement = HTMLInputElement>(selector: string) =>
    root.querySelector<T>(selector) as T;
  return { ...form, root, bar: bar as HTMLElement, input };
}

const stored = () =>
  JSON.parse(sessionStorage.getItem(DRAFT_KEY) ?? 'null') as { fields?: Record<string, string> } | null;

beforeEach(() => {
  sessionStorage.clear();
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('DraftKeeper · volta pra página', () => {
  it('devolve textos, lista e opções marcadas; o aceite volta desmarcado e a faixa avisa', () => {
    const { vm, input, bar, root } = mount({ saved: SAVED });
    expect(input('#reg-name').value).toBe('Ana Souza');
    expect(input('#reg-institution').value).toBe('Faculdade Exemplo');
    expect(input<HTMLSelectElement>('#reg-period').value).toBe('2');
    expect(input('#reg-profile-other-institution').checked).toBe(true);
    expect(input('#reg-adult-no').checked).toBe(true);
    // a resposta já mostra os campos dela e o aviso de menor de idade
    expect(root.querySelector<HTMLElement>('[data-show-field="institution"]')?.hidden).toBe(false);
    expect(root.querySelector<HTMLElement>('[data-minor-notice]')?.hidden).toBe(false);
    expect(vm.fields).toMatchObject({ profile: 'other-institution', adult: 'no', acceptedTerms: false });
    expect(input('#reg-terms').checked).toBe(false);
    expect(bar.hidden).toBe(false);
    expect(bar.textContent).toContain('Rascunho recuperado');
    expect(root.querySelector('[data-reg-live]')?.textContent).toBe('Rascunho recuperado.');
  });

  it('o que a pessoa já digitou nesta visita (antes do JS) ganha do rascunho', () => {
    const { vm, input } = mount({
      saved: SAVED,
      before: (root) => {
        const name = root.querySelector<HTMLInputElement>('#reg-name');
        if (name) name.value = 'Bruna Lima';
      },
    });
    expect(input('#reg-name').value).toBe('Bruna Lima');
    expect(vm.fields.name).toBe('Bruna Lima');
    expect(vm.fields.email).toBe('ana@exemplo.com');
  });

  it('sem origem no endereço, vale a do rascunho; com origem, a do endereço', async () => {
    const restored = mount({ saved: SAVED });
    fillValid(restored.vm);
    vi.useRealTimers();
    await restored.vm.submit();
    expect(restored.gateway.calls[0]?.source).toBe('hero');

    vi.useFakeTimers();
    const fresh = mount({ saved: SAVED, source: 'faq' });
    fillValid(fresh.vm);
    vi.useRealTimers();
    await fresh.vm.submit();
    expect(fresh.gateway.calls[0]?.source).toBe('faq');
  });
});

describe('DraftKeeper · enquanto preenche', () => {
  it('salva depois de uma pausa na digitação e marca "Rascunho salvo nesta aba"', () => {
    const { vm, bar } = mount({ source: 'final' });
    vm.setValue('name', 'Ana Souza');
    expect(stored()).toBeNull();
    vi.advanceTimersByTime(450);
    expect(stored()).toMatchObject({
      fields: { name: 'Ana Souza' },
      source: 'final',
      sessionKey: 'chave-0001',
    });
    expect(bar.hidden).toBe(false);
    expect(bar.textContent).toContain('Rascunho salvo nesta aba');
  });

  it('saindo da página (pagehide) grava na hora', () => {
    const { vm } = mount();
    vm.setValue('email', 'ana@exemplo.com');
    window.dispatchEvent(new Event('pagehide'));
    expect(stored()?.fields?.['email']).toBe('ana@exemplo.com');
  });

  it('"Limpar rascunho" apaga o salvo, zera campos e opções e leva o foco pro nome', () => {
    const { vm, input, bar, root } = mount({ saved: SAVED });
    bar.querySelector<HTMLButtonElement>('[data-draft-clear]')?.click();
    expect(sessionStorage.getItem(DRAFT_KEY)).toBeNull();
    expect(vm.fields).toEqual(emptyFields());
    expect(input('#reg-name').value).toBe('');
    expect(input<HTMLSelectElement>('#reg-period').value).toBe('');
    expect(input('#reg-profile-other-institution').checked).toBe(false);
    expect(document.activeElement?.id).toBe('reg-name');
    expect(bar.hidden).toBe(true);
    expect(root.querySelector('[data-reg-live]')?.textContent).toContain('Rascunho apagado');
  });

  it('pagehide e visibilitychange juntos gravam uma vez só (e nada sem mudança)', () => {
    const { vm } = mount();
    const write = vi.spyOn(sessionStorage, 'setItem');
    vm.setValue('name', 'Ana Souza');
    window.dispatchEvent(new Event('pagehide'));
    Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
    expect(write.mock.calls.filter(([key]) => key === DRAFT_KEY)).toHaveLength(1);
    write.mockRestore();
    Object.defineProperty(document, 'visibilityState', { value: 'visible', configurable: true });
  });

  it('"Limpar rascunho" com o envio em andamento: o botão desliga e nada é apagado', async () => {
    const { vm, gateway, bar } = mount({ saved: SAVED });
    fillValid(vm);
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
    // mesmo que o clique chegue (botão religado à força), o que está indo pra planilha continua na tela
    clear.disabled = false;
    clear.click();
    expect(vm.fields.name).toBe('Ana Souza');
    expect(sessionStorage.getItem(DRAFT_KEY)).not.toBeNull();
    answer({ protocol: 'HR26-OK0001' });
    await sending;
    expect(vm.state.value.status).toBe('success');
  });

  it('resposta perdida + recarregar: o rascunho devolve a chave e o reenvio é o mesmo envio', async () => {
    const { vm, gateway } = mount({ saved: { ...SAVED, sessionKey: LOST_KEY } });
    fillValid(vm);
    vi.useRealTimers();
    await vm.submit();
    expect(gateway.calls[0]?.idempotencyKey).toBe(LOST_KEY);
  });

  it('inscrição enviada: o rascunho some e nada mais é salvo', async () => {
    const { vm } = mount({ saved: SAVED });
    fillValid(vm);
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

// prévia de revisão (PUBLIC_REGISTRATION_SIMULATED=true sem endpoint, ou o dev): /inscricao abre com o gateway
// em memória e mostra o aviso "Prévia de revisão" no topo e na tela de sucesso. Com endpoint, nada disso
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationDTO } from '@application/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { formStatus } from '@presentation/components/registration/formStatus';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { formMarkup } from './formMarkup';
import { fillValid, setupForm } from './formSetup';

// caminho montado pelo node:path: o URL do happy-dom não resolve file:// relativo
const SRC = resolve(dirname(fileURLToPath(import.meta.url)), '../../../src/presentation');
const read = (path: string) => readFileSync(resolve(SRC, path), 'utf8');

const BANNER_TEXT = 'as inscrições são simuladas e nada é gravado na planilha.';

function registration(overrides: Partial<RegistrationDTO> = {}): RegistrationDTO {
  return {
    status: 'soon',
    endpoint: null,
    closesAt: null,
    slots: { capacity: null, taken: 0, remaining: null, level: 'unknown' },
    teamSize: { min: 4, max: 5 },
    ...overrides,
  };
}

describe('formStatus na prévia', () => {
  it('flag ligada sem endpoint: o "em breve" vira inscrição aberta e simulada', () => {
    expect(formStatus(registration(), true)).toEqual({ status: 'open', simulated: true, isOpen: true });
  });

  it('flag desligada (produção sem endpoint): continua "em breve", sem aviso de prévia', () => {
    expect(formStatus(registration(), false)).toEqual({ status: 'soon', simulated: false, isOpen: false });
  });

  it('com endpoint a planilha ganha: a flag é ignorada', () => {
    const live = registration({ status: 'open', endpoint: 'https://script.google.com/macros/s/abc/exec' });
    expect(formStatus(live, true)).toEqual({ status: 'open', simulated: false, isOpen: true });
  });

  it('prazo vencido ou vagas esgotadas fecham também na prévia', () => {
    expect(formStatus(registration({ status: 'closed' }), true)).toEqual({
      status: 'closed',
      simulated: false,
      isOpen: false,
    });
  });
});

describe('aviso "Prévia de revisão" no HTML', () => {
  const form = read('components/registration/RegistrationForm.astro');
  const banner = read('components/registration/PreviewBanner.astro');
  const success = read('components/registration/RegistrationSuccess.astro');
  const notice = read('components/registration/RegistrationNotice.astro');

  it('só entra no formulário em modo simulado: no topo e no slot da tela de sucesso', () => {
    expect(form).toContain('{simulated && <PreviewBanner />}');
    expect(form).toContain(
      '<RegistrationSuccess drawAt={drawAt}>{simulated && <PreviewBanner compact />}</RegistrationSuccess>',
    );
    expect(form.match(/<PreviewBanner\b/g)).toHaveLength(2);
    expect(form).toContain("data-simulated={simulated ? 'true' : undefined}");
  });

  it('é uma nota com o texto inteiro para o leitor de tela (a etiqueta "Prévia" é decorativa)', () => {
    expect(banner).toMatch(/role="note"/);
    expect(banner).toContain('<strong>Prévia de revisão:</strong>');
    expect(banner).toContain(BANNER_TEXT);
    expect(banner).toMatch(/class="preview-banner__tag" aria-hidden="true"/);
    // tokens do design system, nada de cor solta
    const css = banner.slice(banner.indexOf('<style>'));
    expect(css).not.toMatch(/#[0-9a-f]{3,8}\b|rgb\(/i);
  });

  it('na tela de sucesso vem logo abaixo do título que recebe o foco', () => {
    expect(success).toMatch(/data-reg-success-title>[\s\S]*?<\/h2>\s*<slot \/>/);
  });

  it('o aviso de estado não carrega mais o selo "DEV" antigo', () => {
    expect(notice).not.toMatch(/simulated|notice-dev|DEV/);
  });

  it('enviada, o aviso do topo sai e fica só o da tela de sucesso', () => {
    const states = read('components/registration/registration-states.css');
    expect(states).toContain('.regform:has([data-reg-success]:not([hidden])) > [data-preview-banner]');
  });
});

describe('anúncio do sucesso', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  async function submitWith(simulated: boolean, View = RegistrationFormView): Promise<string> {
    const html = formMarkup();
    document.body.innerHTML = simulated
      ? html.replace('data-registration-form', 'data-registration-form data-simulated="true"')
      : html;
    const { vm, gateway } = setupForm();
    const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
    new View(root, vm, new EventBus<AppEvents>()).mount();
    fillValid(vm);
    await vm.submit();
    expect(gateway.calls).toHaveLength(1);
    return root.querySelector('[data-reg-live]')?.textContent ?? '';
  }

  it('na prévia, quem ouve a tela também fica sabendo que nada foi gravado', async () => {
    const text = await submitWith(true);
    expect(text).toBe('Inscrição simulada recebida. Protocolo HR26-TESTE1. Nada foi gravado na planilha.');
  });

  it('com a planilha de verdade o anúncio segue o mesmo', async () => {
    const text = await submitWith(false);
    expect(text).toBe('Inscrição recebida. Protocolo HR26-TESTE1.');
  });

  // build de produção sem a flag: o texto simulado sai do bundle, então nem um data-simulated perdido o liga
  it('build sem simulação ignora o data-simulated', async () => {
    vi.resetModules();
    vi.stubEnv('DEV', false);
    try {
      const { RegistrationFormView: View } = await import('@presentation/views/RegistrationFormView');
      const text = await submitWith(true, View);
      expect(text).toBe('Inscrição recebida. Protocolo HR26-TESTE1.');
    } finally {
      vi.unstubAllEnvs();
      vi.resetModules();
    }
  });
});

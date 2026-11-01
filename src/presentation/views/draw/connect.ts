import { createDrawServices, type DrawServices } from '@composition/draw';
import { DrawGatewayError } from '@application/draw/DrawGateway';
import { h, mustFind } from './dom';

// o que o servidor do `npm run sorteio` diz sobre onde ler e gravar
interface ServerConfig {
  mode: 'local' | 'sheet';
  label: string;
  endpoint?: string;
}

const TOKEN_KEY = 'sorteio-senha';

function readToken(): string | null {
  try {
    return sessionStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function saveToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    // sem sessionStorage a senha só vale até recarregar a página
  }
}

// pede a senha do sorteio (a mesma SORTEIO_SENHA das propriedades do Apps Script) num diálogo
function askToken(reason: string): Promise<string> {
  return new Promise((resolve) => {
    const input = h('input', {
      type: 'password',
      autocomplete: 'off',
      required: true,
      'aria-label': 'Senha do sorteio',
    });
    const hint = h('p', { class: 'dialog__hint' }, reason);
    const form = h(
      'form',
      { method: 'dialog' },
      h('h2', {}, 'Senha do sorteio'),
      hint,
      input,
      h('button', { class: 'btn btn--primary', type: 'submit' }, 'Entrar'),
    );
    const dialog = h('dialog', { class: 'dialog' }, form);
    document.body.append(dialog);
    form.addEventListener('submit', () => {
      const token = input.value.trim();
      dialog.close();
      dialog.remove();
      resolve(token);
    });
    dialog.addEventListener('cancel', (event) => event.preventDefault());
    dialog.showModal();
    input.focus();
  });
}

export function showSource(services: DrawServices): void {
  const badge = mustFind<HTMLElement>('[data-source]');
  const real = services.source.mode === 'sheet';
  badge.textContent = real
    ? `PLANILHA REAL · ${services.source.label}`
    : `CÓPIA DE TESTE · ${services.source.label}`;
  badge.dataset['mode'] = real ? 'real' : 'test';
}

// descobre a origem dos dados e confere que ela responde (senha certa, planilha com as abas). Devolve os serviços prontos
export async function connect(): Promise<DrawServices> {
  const response = await fetch('/__sorteio/config');
  const config = (await response.json()) as ServerConfig;
  if (config.mode === 'local') {
    const services = createDrawServices({ mode: 'local', label: config.label });
    showSource(services);
    return services;
  }
  let reason = 'A planilha real só responde a quem sabe a senha. Ela não fica salva em lugar nenhum do site.';
  for (;;) {
    const token = readToken() ?? (await askToken(reason));
    const services = createDrawServices({
      mode: 'sheet',
      endpoint: config.endpoint ?? '',
      token,
      label: config.label,
    });
    try {
      await services.status.execute();
      saveToken(token);
      showSource(services);
      return services;
    } catch (error) {
      saveToken(null);
      if (!(error instanceof DrawGatewayError) || error.kind !== 'unauthorized') throw error;
      reason = 'Senha incorreta. Tente de novo.';
    }
  }
}

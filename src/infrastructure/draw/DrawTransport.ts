import { DrawGatewayError } from '@application/draw/DrawGateway';

// o que a planilha responde (a do Apps Script no dia, a cópia local nos testes): sempre { ok, ... }
export type WireResponse =
  { ok: true; [key: string]: unknown } | { ok: false; error: string; message?: string };

// como o pedido chega na planilha: pelo servidor local (cópia do xlsx) ou pela função do site (planilha real)
export interface DrawTransport {
  call(body: Record<string, unknown>): Promise<WireResponse>;
}

const TIMEOUT_MS = 30_000;

async function postJson(url: string, body: Record<string, unknown>): Promise<WireResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (response.status === 401) return { ok: false, error: 'unauthorized' };
    // erro com corpo { ok: false, message } (planilha fora, configuração): a mensagem chega na tela
    const parsed = (await response.json().catch(() => null)) as WireResponse | null;
    if (parsed && typeof parsed === 'object' && 'ok' in parsed) return parsed;
    throw new DrawGatewayError('server', `HTTP ${response.status}`);
  } catch (error) {
    if (error instanceof DrawGatewayError) throw error;
    throw new DrawGatewayError('network', 'Sem conexão com o site. Confira a internet e tente de novo.');
  } finally {
    clearTimeout(timer);
  }
}

// servidor local do `npm run sorteio` (a cópia do xlsx)
export class LocalDrawTransport implements DrawTransport {
  constructor(private readonly path = '/__sorteio/api') {}

  call(body: Record<string, unknown>): Promise<WireResponse> {
    return postJson(this.path, body);
  }

  // só na cópia de teste: desfaz equipes e nomes (ou só os nomes), mantendo os credenciados
  async reset(only: 'all' | 'names' = 'all'): Promise<void> {
    const response = await this.call({ action: only === 'names' ? 'draw-reset-names' : 'draw-reset' });
    if (!response.ok)
      throw new DrawGatewayError('server', response.message ?? 'Não consegui recomeçar o teste.');
  }
}

// site (hackarun.com.br/sorteio): a função da Cloudflare confere a sessão da organização e repassa ao Apps Script com a
// chave do sorteio, que nunca passa pelo navegador
export class SiteDrawTransport implements DrawTransport {
  constructor(private readonly path = '/api/sorteio') {}

  call(body: Record<string, unknown>): Promise<WireResponse> {
    return postJson(this.path, body);
  }
}

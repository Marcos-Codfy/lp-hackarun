import { DrawGatewayError } from '@application/draw/DrawGateway';

// o que a planilha responde (a do Apps Script no dia, a cópia local nos testes): sempre { ok, ... }
export type WireResponse =
  { ok: true; [key: string]: unknown } | { ok: false; error: string; message?: string };

// como o pedido chega na planilha: pelo servidor local (cópia do xlsx) ou direto no Apps Script (com a senha)
export interface DrawTransport {
  call(body: Record<string, unknown>): Promise<WireResponse>;
}

const TIMEOUT_MS = 30_000;

async function postJson(
  url: string,
  body: Record<string, unknown>,
  contentType: string,
): Promise<WireResponse> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': contentType },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new DrawGatewayError('server', `HTTP ${response.status}`);
    return (await response.json()) as WireResponse;
  } catch (error) {
    if (error instanceof DrawGatewayError) throw error;
    throw new DrawGatewayError('network', error instanceof Error ? error.message : 'Sem conexão');
  } finally {
    clearTimeout(timer);
  }
}

// servidor local do `npm run sorteio` (a cópia do xlsx)
export class LocalDrawTransport implements DrawTransport {
  constructor(private readonly path = '/__sorteio/api') {}

  call(body: Record<string, unknown>): Promise<WireResponse> {
    return postJson(this.path, body, 'application/json');
  }

  // só na cópia de teste: desfaz equipes e nomes (ou só os nomes), mantendo os credenciados
  async reset(only: 'all' | 'names' = 'all'): Promise<void> {
    const response = await this.call({ action: only === 'names' ? 'draw-reset-names' : 'draw-reset' });
    if (!response.ok)
      throw new DrawGatewayError('server', response.message ?? 'Não consegui recomeçar o teste.');
  }
}

// Apps Script da planilha real. A senha (SORTEIO_SENHA nas propriedades do script) vai no corpo de cada pedido:
// quem tem só o endereço do site não consegue ler nem gravar nada
export class AppsScriptDrawTransport implements DrawTransport {
  constructor(
    private readonly endpoint: string,
    private readonly token: string,
  ) {}

  call(body: Record<string, unknown>): Promise<WireResponse> {
    // text/plain: pedido "simples" (sem preflight), como o formulário do site
    return postJson(this.endpoint, { ...body, token: this.token }, 'text/plain;charset=utf-8');
  }
}

// porteiro do sorteio no site (Cloudflare Pages Function): desligado = 404, login com limite de tentativas, sessão
// assinada e repasse ao Apps Script só de ações do sorteio, com a chave que nunca volta pro navegador
// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';
import { MAX_FAILURES, MemoryAttemptStore } from '../../src/server/sorteio/attempts';
import type { SorteioEnv } from '../../src/server/sorteio/config';
import { handleSorteio, isSorteioPath, type SorteioDeps } from '../../src/server/sorteio/handler';
import { SESSION_HOURS } from '../../src/server/sorteio/session';

const ORIGIN = 'https://hackarun.com.br';
const TOKEN = 't'.repeat(32);
const ENV: SorteioEnv = {
  SORTEIO_ATIVO: 'sim',
  SORTEIO_USUARIO: 'org',
  SORTEIO_SENHA: 'Senha#Teste1',
  SORTEIO_TOKEN: TOKEN,
  SORTEIO_PLANILHA_URL: 'https://script.google.com/macros/s/x/exec',
};

function harness(env: SorteioEnv = ENV) {
  let now = Date.parse('2026-11-12T19:00:00-03:00');
  const upstream = vi.fn<(input: unknown, init?: RequestInit) => Promise<Response>>(() =>
    Promise.resolve(new Response(JSON.stringify({ ok: true, accredited: [], teams: [] }))),
  );
  const next = vi.fn(() => Promise.resolve(new Response('<h1>tela do sorteio</h1>', { status: 200 })));
  const deps: SorteioDeps = {
    next,
    notFound: () => Promise.resolve(new Response('<h1>404</h1>')),
    attempts: new MemoryAttemptStore(() => now),
    fetch: upstream as unknown as typeof fetch,
    now: () => now,
    sleep: () => Promise.resolve(),
  };
  const send = (path: string, init: RequestInit = {}) =>
    handleSorteio(new Request(ORIGIN + path, init), env, deps);
  const login = (usuario: string, senha: string, voltar = '/sorteio', headers: Record<string, string> = {}) =>
    send('/sorteio/entrar', {
      method: 'POST',
      headers: { Origin: ORIGIN, 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      body: new URLSearchParams({ usuario, senha, voltar }).toString(),
    });
  const cookieOf = (response: Response) => (response.headers.get('Set-Cookie') ?? '').split(';')[0] ?? '';
  const api = (body: unknown, cookie: string, origin = ORIGIN) =>
    send('/api/sorteio', {
      method: 'POST',
      headers: { Origin: origin, Cookie: cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  return { send, login, cookieOf, api, upstream, next, tick: (ms: number) => (now += ms) };
}

describe('sorteio no site · liga/desliga', () => {
  it('desligado (ou sem SORTEIO_ATIVO=sim) as telas e a API não existem', async () => {
    const { send, login } = harness({ ...ENV, SORTEIO_ATIVO: 'nao' });
    expect((await send('/sorteio')).status).toBe(404);
    expect((await send('/sorteio/nomes')).status).toBe(404);
    expect((await login('org', 'Senha#Teste1')).status).toBe(404);
    expect((await send('/api/sorteio', { method: 'POST', body: '{}' })).status).toBe(404);
  });

  it('ligado sem a configuração completa avisa (503) sem dizer o que falta', async () => {
    const { send } = harness({ ...ENV, SORTEIO_TOKEN: 'curta' });
    const response = await send('/sorteio');
    expect(response.status).toBe(503);
    expect(await response.text()).not.toContain('SORTEIO_TOKEN');
  });

  it('só os caminhos do sorteio passam pela função', () => {
    expect(['/sorteio', '/sorteio/nomes', '/sorteio.html', '/api/sorteio'].every(isSorteioPath)).toBe(true);
    expect(['/', '/equipes', '/sorteios', '/api/outra', '/inscricao'].some(isSorteioPath)).toBe(false);
  });
});

describe('sorteio no site · login e sessão', () => {
  it('sem sessão a tela mostra o login (e não a página do sorteio)', async () => {
    const { send, next } = harness();
    const response = await send('/sorteio/nomes');
    const page = await response.text();
    expect(response.status).toBe(200);
    expect(page).toContain('action="/sorteio/entrar"');
    expect(page).toContain('value="/sorteio/nomes"');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('X-Robots-Tag')).toContain('noindex');
    expect(next).not.toHaveBeenCalled();
  });

  it('login certo cria a sessão (cookie seguro) e volta para a tela pedida; o login ignora maiúsculas', async () => {
    const { send, login, cookieOf, next } = harness();
    const response = await login(' ORG ', 'Senha#Teste1', '/sorteio/nomes');
    expect(response.status).toBe(303);
    expect(response.headers.get('Location')).toBe('/sorteio/nomes');
    const header = response.headers.get('Set-Cookie') ?? '';
    expect(header).toMatch(/^__Host-hr_sorteio=v1\./);
    expect(header).toContain('HttpOnly');
    expect(header).toContain('Secure');
    expect(header).toContain('SameSite=Strict');
    const page = await send('/sorteio/nomes', { headers: { Cookie: cookieOf(response) } });
    expect(await page.text()).toBe('<h1>tela do sorteio</h1>');
    expect(page.headers.get('Cache-Control')).toBe('no-store');
    expect(next).toHaveBeenCalledTimes(1);
  });

  it('senha errada (ou com espaço a mais) recusa; voltar para fora do sorteio vira /sorteio', async () => {
    const { login } = harness();
    const wrong = await login('org', 'senha#teste1');
    expect(wrong.status).toBe(401);
    expect(await wrong.text()).toContain('Login ou senha incorretos');
    expect((await login('org', 'Senha#Teste1 ')).status).toBe(401);
    expect((await login('org', 'Senha#Teste1', 'https://malicioso.example')).headers.get('Location')).toBe(
      '/sorteio',
    );
  });

  it(`${MAX_FAILURES} erros seguidos travam o login por 15 minutos, mesmo com a senha certa`, async () => {
    const { login, tick } = harness();
    for (let i = 0; i < MAX_FAILURES; i++) await login('org', 'errada');
    const locked = await login('org', 'Senha#Teste1');
    expect(locked.status).toBe(429);
    expect(locked.headers.get('Set-Cookie')).toBeNull();
    tick(15 * 60 * 1000 + 1);
    expect((await login('org', 'Senha#Teste1')).status).toBe(303);
  });

  it('login vindo de outro site é recusado', async () => {
    const { login } = harness();
    expect((await login('org', 'Senha#Teste1', '/sorteio', { Origin: 'https://outro.example' })).status).toBe(
      403,
    );
  });

  it('cookie adulterado, de outra senha ou vencido não vale', async () => {
    const { send, login, cookieOf, tick } = harness();
    const cookie = cookieOf(await login('org', 'Senha#Teste1'));
    const tampered = cookie.replace(/v1\.(\d+)/, (_m, n: string) => `v1.${Number(n) + 999}`);
    const isLogin = async (c: string) =>
      (await (await send('/sorteio', { headers: { Cookie: c } })).text()).includes('entrar');
    expect(await isLogin(cookie)).toBe(false);
    expect(await isLogin(tampered)).toBe(true);
    // trocar a senha derruba as sessões abertas
    const other = harness({ ...ENV, SORTEIO_SENHA: 'Outra#Senha2' });
    expect(await (await other.send('/sorteio', { headers: { Cookie: cookie } })).text()).toContain('entrar');
    tick(SESSION_HOURS * 3600 * 1000);
    expect(await isLogin(cookie)).toBe(true);
  });

  it('sair apaga o cookie; caminho que não é tela do sorteio dá 404 mesmo com sessão', async () => {
    const { send, login, cookieOf } = harness();
    const cookie = cookieOf(await login('org', 'Senha#Teste1'));
    const out = await send('/sorteio/sair', { method: 'POST', headers: { Origin: ORIGIN, Cookie: cookie } });
    expect(out.status).toBe(303);
    expect(out.headers.get('Set-Cookie')).toContain('Max-Age=0');
    expect((await send('/sorteio/qualquer', { headers: { Cookie: cookie } })).status).toBe(404);
  });
});

describe('sorteio no site · API', () => {
  async function session() {
    const h = harness();
    const cookie = h.cookieOf(await h.login('org', 'Senha#Teste1'));
    return { ...h, cookie };
  }

  it('sem sessão, de outro site ou com ação fora da lista, nada chega na planilha', async () => {
    const { api, cookie, upstream } = await session();
    expect((await api({ action: 'draw-list' }, '')).status).toBe(401);
    expect((await api({ action: 'draw-list' }, cookie, 'https://outro.example')).status).toBe(403);
    expect((await api({ action: 'draw-reset' }, cookie)).status).toBe(400);
    expect((await api({ action: 'register-mentor' }, cookie)).status).toBe(400);
    expect((await api(['draw-list'], cookie)).status).toBe(400);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('repassa a ação com a chave do sorteio e devolve a resposta da planilha (sem a chave)', async () => {
    const { api, cookie, upstream } = await session();
    const response = await api(
      { action: 'draw-save', teams: [{ number: 1, members: ['A'] }], token: 'x' },
      cookie,
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true, accredited: [], teams: [] });
    const [url, init] = upstream.mock.calls[0] ?? [];
    expect(url).toBe(ENV.SORTEIO_PLANILHA_URL);
    // a chave do servidor sempre ganha (o navegador não consegue mandar outra)
    expect(JSON.parse(String(init?.body))).toEqual({
      action: 'draw-save',
      teams: [{ number: 1, members: ['A'] }],
      token: TOKEN,
    });
  });

  it('planilha que recusa a chave, que cai ou responde lixo vira erro claro (e a chave não vaza)', async () => {
    const { api, cookie, upstream } = await session();
    upstream.mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: 'unauthorized' })));
    const refused = await api({ action: 'draw-list' }, cookie);
    expect(refused.status).toBe(502);
    expect(await refused.text()).not.toContain(TOKEN);
    upstream.mockRejectedValueOnce(new Error('timeout'));
    expect((await api({ action: 'draw-list' }, cookie)).status).toBe(504);
    upstream.mockResolvedValueOnce(new Response('<html>erro</html>', { status: 500 }));
    expect((await api({ action: 'draw-list' }, cookie)).status).toBe(502);
    // conflito de regra (ex.: Pokémon repetido) passa direto, com a mensagem da planilha
    upstream.mockResolvedValueOnce(
      new Response(JSON.stringify({ ok: false, error: 'conflict', message: 'x' })),
    );
    expect(await (await api({ action: 'draw-names', items: [] }, cookie)).json()).toEqual({
      ok: false,
      error: 'conflict',
      message: 'x',
    });
  });
});

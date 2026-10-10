import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationPayload } from '@application/index';
import { AppsScriptClient, type FetchLike } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptRegistrationGateway } from '@infrastructure/registration/AppsScriptRegistrationGateway';

const ENDPOINT = 'https://script.google.com/macros/s/abc/exec';
const payload = { mode: 'solo', leader: { email: 'ana@exemplo.com' } } as RegistrationPayload;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

function gatewayWith(fetchFn: FetchLike) {
  const spy = vi.fn(fetchFn);
  return { spy, gateway: new AppsScriptRegistrationGateway(new AppsScriptClient(ENDPOINT, spy)) };
}

afterEach(() => {
  vi.useRealTimers();
});

describe('AppsScriptRegistrationGateway', () => {
  it('faz um POST "simples" (sem preflight) e devolve o protocolo', async () => {
    const { spy, gateway } = gatewayWith(async () => jsonResponse({ ok: true, protocol: 'HR26-AB12CD' }));
    await expect(gateway.submit(payload)).resolves.toEqual({ protocol: 'HR26-AB12CD' });
    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({
      method: 'POST',
      redirect: 'follow',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    });
    expect(JSON.parse(String(init?.body))).toMatchObject({ action: 'register', mode: 'solo' });
  });

  it.each([
    ['duplicate', 'duplicate'],
    ['closed', 'closed'],
    ['invalid', 'rejected'],
    ['rate-limited', 'rate-limited'],
    ['server', 'rejected'],
  ])('erro "%s" do servidor vira "%s"', async (error, kind) => {
    const { gateway } = gatewayWith(async () => jsonResponse({ ok: false, error }));
    await expect(gateway.submit(payload)).rejects.toMatchObject({ kind });
  });

  it('sem rede vira "network"', async () => {
    const { gateway } = gatewayWith(() => Promise.reject(new TypeError('Failed to fetch')));
    await expect(gateway.submit(payload)).rejects.toMatchObject({ kind: 'network' });
  });

  it('resposta que não é JSON (página de login do Google) vira "network"', async () => {
    const { gateway } = gatewayWith(async () => new Response('<html>login</html>', { status: 200 }));
    await expect(gateway.submit(payload)).rejects.toMatchObject({ kind: 'network' });
  });

  it('HTTP 429 vira "rate-limited" e 500 vira "network"', async () => {
    await expect(
      gatewayWith(async () => jsonResponse({}, 429)).gateway.submit(payload),
    ).rejects.toMatchObject({
      kind: 'rate-limited',
    });
    await expect(
      gatewayWith(async () => jsonResponse({}, 500)).gateway.submit(payload),
    ).rejects.toMatchObject({
      kind: 'network',
    });
  });

  it('aborta depois de 15s', async () => {
    vi.useFakeTimers();
    const { gateway } = gatewayWith(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const result = gateway.submit(payload).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(15_000);
    await expect(result).resolves.toMatchObject({ kind: 'network', message: 'Timeout' });
  });
});

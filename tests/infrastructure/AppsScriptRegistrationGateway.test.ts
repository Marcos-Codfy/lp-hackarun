import { afterEach, describe, expect, it, vi } from 'vitest';
import type { RegistrationPayload } from '@application/index';
import { AppsScriptRegistrationCounter } from '@infrastructure/registration/AppsScriptRegistrationCounter';
import { AppsScriptClient, type FetchLike } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptRegistrationGateway } from '@infrastructure/registration/AppsScriptRegistrationGateway';

const ENDPOINT = 'https://script.google.com/macros/s/abc/exec';
const payload: RegistrationPayload = {
  participant: {
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    whatsapp: '(63) 99999-1234',
    profile: 'unicatolica',
    institution: 'UniCatólica',
    course: 'Engenharia de Software',
    period: 3,
    studentId: '2024100123',
    area: '',
    adult: true,
  },
  submittedAt: '2026-10-20T12:00:00.000Z',
  source: 'landing-page',
  consentVersion: '2026-10-v4',
  consentAt: '2026-10-20T12:00:00.000Z',
  honeypot: '',
  elapsedMs: 9000,
  idempotencyKey: '',
};

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
    expect(JSON.parse(String(init?.body))).toMatchObject({
      action: 'register',
      participant: { email: 'ana@exemplo.com', whatsapp: '(63) 99999-1234' },
    });
  });

  it('a chave de idempotência vai no corpo', async () => {
    const { spy, gateway } = gatewayWith(async () => jsonResponse({ ok: true, protocol: 'HR26-AB12CD' }));
    await gateway.submit({ ...payload, idempotencyKey: 'chave-0001' });
    const [, init] = spy.mock.calls[0] ?? [];
    expect(JSON.parse(String(init?.body))).toMatchObject({ idempotencyKey: 'chave-0001' });
  });

  it.each([
    ['duplicate', 'duplicate'],
    ['duplicate_email', 'duplicate-email'],
    ['duplicate_whatsapp', 'duplicate-whatsapp'],
    ['duplicate_student_id', 'duplicate-student-id'],
    ['constructor', 'rejected'],
    ['closed', 'closed'],
    ['invalid', 'rejected'],
    ['rate-limited', 'rate-limited'],
    ['server', 'server'],
    ['quebrou', 'rejected'],
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

  it('HTTP 429 vira "rate-limited" e 500 vira "server"', async () => {
    await expect(
      gatewayWith(async () => jsonResponse({}, 429)).gateway.submit(payload),
    ).rejects.toMatchObject({
      kind: 'rate-limited',
    });
    await expect(
      gatewayWith(async () => jsonResponse({}, 500)).gateway.submit(payload),
    ).rejects.toMatchObject({
      kind: 'server',
    });
  });

  it('dá 20s pro envio e depois aborta', async () => {
    vi.useFakeTimers();
    let aborted = false;
    const { gateway } = gatewayWith(
      (_url, init) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            aborted = true;
            reject(new DOMException('aborted', 'AbortError'));
          });
        }),
    );
    const result = gateway.submit(payload).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(19_000);
    expect(aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(1_000);
    await expect(result).resolves.toMatchObject({ kind: 'network', message: 'Timeout' });
  });
});

describe('AppsScriptRegistrationCounter', () => {
  const counterWith = (fetchFn: FetchLike) =>
    new AppsScriptRegistrationCounter(new AppsScriptClient(ENDPOINT, fetchFn));

  it('lê as vagas ocupadas do GET ?action=slots', async () => {
    const spy = vi.fn<FetchLike>(async () => jsonResponse({ ok: true, open: true, capacity: 75, taken: 12 }));
    await expect(counterWith(spy).taken()).resolves.toBe(12);
    expect(String(spy.mock.calls[0]?.[0])).toBe(`${ENDPOINT}?action=slots`);
  });

  it.each([
    ['ok false', { ok: false, error: 'unknown-action' }],
    ['número torto', { ok: true, taken: 2.5 }],
    ['negativo', { ok: true, taken: -1 }],
    ['texto', { ok: true, taken: '12' }],
  ])('%s vira null (vale o build)', async (_case, body) => {
    await expect(counterWith(async () => jsonResponse(body)).taken()).resolves.toBeNull();
  });

  it('falha de rede vira null, sem quebrar a página', async () => {
    await expect(counterWith(() => Promise.reject(new TypeError('offline'))).taken()).resolves.toBeNull();
  });
});

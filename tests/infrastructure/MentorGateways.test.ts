// gateways do cadastro de mentor: o adapter do Apps Script, o simulado (prévia), o "indisponível" (produção sem
// planilha) e a repetição de tentativas
import { describe, expect, it, vi } from 'vitest';
import { RegistrationGatewayError, type MentorPayload } from '@application/index';
import { AppsScriptClient, type FetchLike } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptMentorGateway } from '@infrastructure/registration/AppsScriptMentorGateway';
import { InMemoryMentorGateway } from '@infrastructure/registration/InMemoryMentorGateway';
import { RetryingMentorGateway } from '@infrastructure/registration/RetryingRegistrationGateway';
import { UnavailableMentorGateway } from '@infrastructure/registration/UnavailableMentorGateway';
import { fakeMentorProtocol, fakeProtocol } from '@infrastructure/registration/protocol';
import { FakeMentorGateway } from '../helpers/mentorFixtures';

const ENDPOINT = 'https://script.google.com/macros/s/abc/exec';

const mentor = (overrides: Partial<MentorPayload['mentor']> = {}): MentorPayload['mentor'] => ({
  name: 'Ana Souza',
  email: 'ana.mentora@exemplo.com',
  whatsapp: '(63) 99999-0101',
  area: 'security',
  specialties: '',
  role: 'Analista de segurança',
  company: '',
  experience: '5-to-10',
  linkedin: '',
  graduate: false,
  course: '',
  graduationYear: 0,
  days: ['13'],
  format: 'online',
  mode: 'either',
  notes: '',
  mayPublish: false,
  ...overrides,
});

const payload = (overrides: Partial<MentorPayload> = {}, m = mentor()): MentorPayload => ({
  mentor: m,
  submittedAt: '2026-11-01T12:00:00.000Z',
  source: 'crew',
  consentVersion: '2026-10-m1',
  consentAt: '2026-11-01T12:00:00.000Z',
  honeypot: '',
  elapsedMs: 9000,
  idempotencyKey: 'chave-0001',
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

describe('AppsScriptMentorGateway', () => {
  function gatewayWith(fetchFn: FetchLike) {
    const spy = vi.fn(fetchFn);
    return { spy, gateway: new AppsScriptMentorGateway(new AppsScriptClient(ENDPOINT, spy)) };
  }

  it('manda a ação "register-mentor" num POST simples e devolve o protocolo MT26-', async () => {
    const { spy, gateway } = gatewayWith(async () => jsonResponse({ ok: true, protocol: 'MT26-AB12CD' }));
    await expect(gateway.submit(payload())).resolves.toEqual({ protocol: 'MT26-AB12CD' });
    const [url, init] = spy.mock.calls[0] ?? [];
    expect(url).toBe(ENDPOINT);
    expect(init).toMatchObject({ method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' } });
    expect(JSON.parse(String(init?.body))).toMatchObject({
      action: 'register-mentor',
      mentor: { email: 'ana.mentora@exemplo.com' },
      consentVersion: '2026-10-m1',
      idempotencyKey: 'chave-0001',
    });
  });

  it.each([
    ['duplicate_email', 'duplicate-email'],
    ['duplicate_whatsapp', 'duplicate-whatsapp'],
    ['closed', 'closed'],
    ['invalid', 'rejected'],
    ['rate-limited', 'rate-limited'],
    ['server', 'server'],
    ['quebrou', 'rejected'],
  ])('erro "%s" do servidor vira "%s"', async (error, kind) => {
    const { gateway } = gatewayWith(async () => jsonResponse({ ok: false, error }));
    await expect(gateway.submit(payload())).rejects.toMatchObject({ kind });
  });

  it('sem rede, HTTP 429/500 e página de login do Google viram a falha certa', async () => {
    await expect(
      gatewayWith(() => Promise.reject(new TypeError('Failed to fetch'))).gateway.submit(payload()),
    ).rejects.toMatchObject({ kind: 'network' });
    await expect(
      gatewayWith(async () => jsonResponse({}, 429)).gateway.submit(payload()),
    ).rejects.toMatchObject({
      kind: 'rate-limited',
    });
    await expect(
      gatewayWith(async () => jsonResponse({}, 500)).gateway.submit(payload()),
    ).rejects.toMatchObject({
      kind: 'server',
    });
    await expect(
      gatewayWith(async () => new Response('<html>login</html>', { status: 200 })).gateway.submit(payload()),
    ).rejects.toMatchObject({ kind: 'network' });
  });
});

describe('InMemoryMentorGateway', () => {
  const gateway = () => new InMemoryMentorGateway({ delayMs: 0, sleep: () => Promise.resolve() });

  it('grava e devolve um protocolo MT26- (o da inscrição é HR26-)', async () => {
    const g = gateway();
    const receipt = await g.submit(payload());
    expect(receipt.protocol).toMatch(/^MT26-[A-HJ-NP-Z2-9]{6}$/);
    expect(fakeProtocol()).toMatch(/^HR26-/);
    expect(fakeMentorProtocol()).toMatch(/^MT26-/);
    expect(g.received).toHaveLength(1);
  });

  it('reenvio com a mesma chave e o mesmo e-mail devolve o mesmo protocolo, sem gravar de novo', async () => {
    const g = gateway();
    const first = await g.submit(payload());
    await expect(g.submit(payload())).resolves.toEqual(first);
    expect(g.received).toHaveLength(1);
  });

  it('e-mail ou WhatsApp já cadastrados (chave nova) são conflito, como no servidor', async () => {
    const g = gateway();
    await g.submit(payload());
    await expect(g.submit(payload({ idempotencyKey: 'chave-0002' }))).rejects.toMatchObject({
      kind: 'duplicate-email',
    });
    await expect(
      g.submit(
        payload(
          { idempotencyKey: 'chave-0003' },
          mentor({ email: 'outra@exemplo.com', whatsapp: '63 99999 0101' }),
        ),
      ),
    ).rejects.toMatchObject({ kind: 'duplicate-whatsapp' });
    expect(g.received).toHaveLength(1);
  });

  it.each([
    ['falha@exemplo.com', 'network'],
    ['servidor@exemplo.com', 'server'],
    ['duplicado@exemplo.com', 'duplicate'],
  ])('e-mail %s simula a falha "%s" para testar as telas', async (email, kind) => {
    await expect(gateway().submit(payload({}, mentor({ email })))).rejects.toMatchObject({ kind });
  });
});

describe('UnavailableMentorGateway', () => {
  it('produção sem planilha: qualquer envio vira "cadastro encerrado"', async () => {
    await expect(new UnavailableMentorGateway().submit()).rejects.toMatchObject({ kind: 'closed' });
  });
});

describe('RetryingMentorGateway', () => {
  function setup(inner: FakeMentorGateway) {
    const sleep = vi.fn((_ms: number) => Promise.resolve());
    return {
      gateway: new RetryingMentorGateway(inner, { sleep, random: () => 0.5, baseDelayMs: 100 }),
      sleep,
    };
  }
  const network = () => new RegistrationGatewayError('network', 'offline');

  it('tenta de novo falhas de rede, com o mesmo payload (mesma chave de idempotência)', async () => {
    const inner = new FakeMentorGateway().willThrow(network()).willThrow(network()).willReturn('MT26-OK2345');
    const { gateway, sleep } = setup(inner);
    await expect(gateway.submit(payload())).resolves.toEqual({ protocol: 'MT26-OK2345' });
    expect(inner.calls.map((c) => c.idempotencyKey)).toEqual(['chave-0001', 'chave-0001', 'chave-0001']);
    expect(sleep.mock.calls.map(([ms]) => ms)).toEqual([150, 250]);
  });

  it.each(['duplicate-email', 'duplicate-whatsapp', 'closed', 'rejected'] as const)(
    'não repete "%s": tentar de novo daria o mesmo resultado',
    async (kind) => {
      const inner = new FakeMentorGateway().willThrow(new RegistrationGatewayError(kind, 'x'));
      await expect(setup(inner).gateway.submit(payload())).rejects.toMatchObject({ kind });
      expect(inner.calls).toHaveLength(1);
    },
  );

  it('desiste depois de 3 tentativas', async () => {
    const inner = new FakeMentorGateway().willThrow(network()).willThrow(network()).willThrow(network());
    await expect(setup(inner).gateway.submit(payload())).rejects.toMatchObject({ kind: 'network' });
    expect(inner.calls).toHaveLength(3);
  });
});

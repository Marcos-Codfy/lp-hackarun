import { describe, expect, it, vi } from 'vitest';
import { newIdempotencyKey } from '@presentation/view-models/registration/idempotencyKey';
import { SubmissionSession } from '@presentation/view-models/registration/SubmissionSession';
import { ManualClock } from '../../helpers/fixtures';

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe('newIdempotencyKey', () => {
  it('usa o randomUUID quando existe (contexto seguro)', () => {
    const randomUUID = vi.fn(() => '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40' as const);
    expect(newIdempotencyKey({ randomUUID })).toBe('3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40');
  });

  it('sem randomUUID (http pelo IP da rede) cai no getRandomValues, no formato UUID v4', () => {
    const getRandomValues = <T extends ArrayBufferView | null>(array: T): T => {
      if (array instanceof Uint8Array) array.fill(0xff);
      return array;
    };
    expect(newIdempotencyKey({ getRandomValues })).toMatch(UUID_V4);
  });

  it('sem crypto nenhum ainda gera chaves válidas e diferentes', () => {
    const a = newIdempotencyKey(undefined);
    const b = newIdempotencyKey(undefined);
    expect(a).toMatch(UUID_V4);
    expect(b).toMatch(UUID_V4);
    expect(a).not.toBe(b);
  });

  it('a chave do navegador passa no padrão do servidor (Validation.gs)', () => {
    expect(newIdempotencyKey()).toMatch(/^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/);
  });
});

describe('SubmissionSession', () => {
  it('mede o tempo desde a criação e mantém a chave até completar', () => {
    const clock = new ManualClock('2026-11-01T12:00:00Z');
    const keys = ['k-0001', 'k-0002'];
    const session = new SubmissionSession(clock, () => keys.shift() ?? 'acabou');
    session.setSource('hero');
    clock.advance(1500);
    expect(session.meta('')).toEqual({
      honeypot: '',
      elapsedMs: 1500,
      source: 'hero',
      idempotencyKey: 'k-0001',
    });
    clock.advance(500);
    expect(session.meta('').idempotencyKey).toBe('k-0001');
    session.complete();
    expect(session.meta('')).toMatchObject({ elapsedMs: 2000, idempotencyKey: 'k-0002' });
  });

  it('retoma a chave do rascunho (só no formato que o servidor aceita) até a inscrição entrar', () => {
    const session = new SubmissionSession(new ManualClock('2026-11-01T12:00:00Z'), () => 'nova-0001');
    session.resume('chave com espaço');
    expect(session.key).toBe('nova-0001');
    session.resume('3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40');
    expect(session.meta('').idempotencyKey).toBe('3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40');
    session.complete();
    expect(session.key).toBe('nova-0001');
  });
});

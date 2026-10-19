// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  AppsScriptSandbox,
  KEY,
  OTHER_KEY,
  person,
  registrationBody,
} from '../../helpers/apps-script/sandbox';

// "Tentar de novo" recalcula o horário do envio; só a chave se mantém
const attempt = (i: number, participant: Record<string, unknown> = {}, patch: Record<string, unknown> = {}) =>
  registrationBody(participant, {
    idempotencyKey: KEY,
    submittedAt: `2026-10-20T15:0${i}:00.000Z`,
    ...patch,
  });

describe('Apps Script · idempotência pela chave do formulário', () => {
  it('mesma chave em outro horário devolve o mesmo protocolo, sem duplicar', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    expect(first.ok).toBe(true);
    expect(script.post(attempt(2))).toEqual(first);
    expect(script.registrations.data).toHaveLength(1);
  });

  it('cache expirado: a chave gravada na linha ainda reconhece o envio (nada de "duplicado")', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    script.cache.store.clear();
    expect(script.post(attempt(2))).toEqual(first);
    expect(script.registrations.data).toHaveLength(1);
    expect(script.row(script.registrations, 0)['Chave de envio']).toBe(KEY);
  });

  it('a chave reconhece o envio mesmo com o e-mail em outra caixa', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    script.cache.store.clear();
    expect(script.post(attempt(2, { email: 'ANA@exemplo.com' }))).toEqual(first);
  });

  it('chave diferente pra mesma pessoa é outra inscrição: o e-mail já está em uso', () => {
    const script = new AppsScriptSandbox();
    script.post(attempt(1));
    script.cache.store.clear();
    expect(script.post(attempt(2, {}, { idempotencyKey: OTHER_KEY }))).toEqual({
      ok: false,
      error: 'duplicate_email',
    });
  });

  it('mesma chave com outro e-mail não reaproveita o protocolo de ninguém', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    script.cache.store.clear();
    const other = person(1, {});
    const res = script.post({ ...other, idempotencyKey: KEY });
    expect(res.ok).toBe(true);
    expect(res.protocol).not.toBe(first.protocol);
  });

  it('reenvio depois de cancelado devolve o protocolo antigo (o envio é o mesmo)', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    script.cache.store.clear();
    script.edit(script.registrations, 0, 'Status', 'cancelado');
    expect(script.post(attempt(2))).toEqual(first);
    expect(script.registrations.data).toHaveLength(1);
  });

  it.each(['=HYPERLINK("x")', '-123456789', 'curta', 'x'.repeat(65)])(
    'chave torta (%s) é ignorada e cai na regra de e-mail + horário',
    (key) => {
      const script = new AppsScriptSandbox();
      const first = script.post(attempt(1, {}, { idempotencyKey: key }));
      expect(first.ok).toBe(true);
      expect(script.row(script.registrations, 0)['Chave de envio']).toBe('');
      expect(script.post(attempt(1, {}, { idempotencyKey: key }))).toEqual(first);
      expect(script.post(attempt(2, {}, { idempotencyKey: key })).error).toBe('duplicate_email');
    },
  );

  it('a linha vai pra planilha (flush) antes de soltar o lock: a próxima da fila já vê a inscrição', () => {
    const script = new AppsScriptSandbox();
    expect(script.post(attempt(1)).ok).toBe(true);
    expect(script.flushes).toEqual([true]);
    expect(script.lock.held).toBe(false);
  });

  it('planilha falhou na gravação: o site recebe "server", o lock é solto e o retry grava', () => {
    const script = new AppsScriptSandbox();
    const { registrations } = script.seed([]);
    const append = registrations.appendRow.bind(registrations);
    registrations.appendRow = () => {
      throw new Error('Service Spreadsheets failed');
    };
    expect(script.post(attempt(1))).toEqual({ ok: false, error: 'server' });
    expect(script.lock.held).toBe(false);
    registrations.appendRow = append;
    expect(script.post(attempt(2)).ok).toBe(true);
    expect(script.registrations.data).toHaveLength(1);
  });
});

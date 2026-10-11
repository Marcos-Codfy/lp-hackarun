// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FakeSheet } from '../../helpers/apps-script/fakes';
import { AppsScriptSandbox, registrationBody } from '../../helpers/apps-script/sandbox';

const KEY = '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40';
const leader = registrationBody()['leader'] as Record<string, unknown>;
// "Tentar de novo" recalcula o horário do envio; só a chave se mantém
const attempt = (i: number, patch: Record<string, unknown> = {}) =>
  registrationBody({ idempotencyKey: KEY, submittedAt: `2026-10-20T15:0${i}:00.000Z`, ...patch });

describe('Apps Script · idempotência pela chave do formulário', () => {
  it('mesma chave em outro horário devolve o mesmo protocolo, sem duplicar', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    expect(first.ok).toBe(true);
    expect(script.post(attempt(2))).toEqual(first);
    expect(script.sheet.data).toHaveLength(1);
  });

  it('cache expirado: a chave gravada na linha ainda reconhece o envio (nada de "duplicate")', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    script.cache.store.clear();
    expect(script.post(attempt(2))).toEqual(first);
    expect(script.sheet.data).toHaveLength(1);
  });

  it('grava a chave na coluna própria', () => {
    const script = new AppsScriptSandbox();
    script.post(attempt(1));
    const headers = script.sheet.rows[0] ?? [];
    expect(script.sheet.data[0]?.[headers.indexOf('Chave de envio')]).toBe(KEY);
  });

  it('chave diferente com o mesmo e-mail continua "duplicate"', () => {
    const script = new AppsScriptSandbox();
    script.post(attempt(1));
    script.cache.store.clear();
    const other = attempt(2, { idempotencyKey: '9b1d2c3e-0000-4a4a-8b8b-123456789abc' });
    expect(script.post(other)).toEqual({ ok: false, error: 'duplicate' });
  });

  it('linha antiga sem chave nunca casa com um envio novo', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', 'E-mail': 'ana@exemplo.com', Status: 'pendente' }]);
    expect(script.post(attempt(1))).toEqual({ ok: false, error: 'duplicate' });
  });

  it('mesma chave com outro e-mail é outra inscrição', () => {
    const script = new AppsScriptSandbox();
    script.post(attempt(1));
    const res = script.post(attempt(2, { leader: { ...leader, email: 'ana.souza@exemplo.com' } }));
    expect(res.ok).toBe(true);
    expect(script.sheet.data).toHaveLength(2);
  });

  it.each(['=HYPERLINK("x")', '-123456789', 'curta', 'x'.repeat(65)])(
    'chave torta (%s) é ignorada e cai na regra de e-mail + horário',
    (key) => {
      const script = new AppsScriptSandbox();
      const first = script.post(attempt(1, { idempotencyKey: key }));
      expect(first.ok).toBe(true);
      const headers = script.sheet.rows[0] ?? [];
      expect(script.sheet.data[0]?.[headers.indexOf('Chave de envio')]).toBe('');
      expect(script.post(attempt(1, { idempotencyKey: key }))).toEqual(first);
      expect(script.post(attempt(2, { idempotencyKey: key }))).toEqual({ ok: false, error: 'duplicate' });
    },
  );

  it('planilha criada antes da coluna nova ganha o título na primeira gravação', () => {
    const script = new AppsScriptSandbox();
    const headers = script.evaluate<string[]>('HEADERS');
    const old = new FakeSheet('Inscricoes');
    old.appendRow(headers.slice(0, -1));
    script.sheets.set(old.name, old);
    expect(script.post(attempt(1)).ok).toBe(true);
    expect(old.rows[0]).toEqual(headers);
  });
});

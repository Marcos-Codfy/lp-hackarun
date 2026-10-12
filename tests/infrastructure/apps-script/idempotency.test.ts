// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, MEMBER_B, registrationBody } from '../../helpers/apps-script/sandbox';

const KEY = '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40';
// "Tentar de novo" recalcula o horário do envio; só a chave se mantém
const attempt = (i: number, patch: Record<string, unknown> = {}) =>
  registrationBody({ idempotencyKey: KEY, submittedAt: `2026-10-20T15:0${i}:00.000Z`, ...patch });

describe('Apps Script · idempotência pela chave do formulário', () => {
  it('mesma chave em outro horário devolve o mesmo protocolo, sem duplicar', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    expect(first.ok).toBe(true);
    expect(script.post(attempt(2))).toEqual(first);
    expect(script.teams.data).toHaveLength(1);
    expect(script.members.data).toHaveLength(2);
  });

  it('cache expirado: a chave gravada na linha ainda reconhece o envio (nada de "duplicado")', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(attempt(1));
    script.cache.store.clear();
    expect(script.post(attempt(2))).toEqual(first);
    expect(script.teams.data).toHaveLength(1);
  });

  it('grava a chave na coluna própria', () => {
    const script = new AppsScriptSandbox();
    script.post(attempt(1));
    expect(script.row(script.teams, 0)['Chave de envio']).toBe(KEY);
  });

  it('chave diferente pra mesma equipe é outra inscrição: o nome já está em uso', () => {
    const script = new AppsScriptSandbox();
    script.post(attempt(1));
    script.cache.store.clear();
    const other = attempt(2, { idempotencyKey: '9b1d2c3e-0000-4a4a-8b8b-123456789abc' });
    expect(script.post(other)).toMatchObject({ ok: false, error: 'duplicate_team_name' });
  });

  it('mesma chave com outro contato não reaproveita o protocolo de ninguém', () => {
    const script = new AppsScriptSandbox();
    script.post(attempt(1));
    script.cache.store.clear();
    const res = script.post(
      attempt(2, {
        teamName: 'Outra Equipe',
        members: [{ name: 'Carla Dias', studentId: 'RA-9999', email: 'carla@exemplo.com' }, MEMBER_B],
      }),
    );
    expect(res).toMatchObject({ ok: false, error: 'duplicate_email', members: [1] });
  });

  it.each(['=HYPERLINK("x")', '-123456789', 'curta', 'x'.repeat(65)])(
    'chave torta (%s) é ignorada e cai na regra de contato + horário',
    (key) => {
      const script = new AppsScriptSandbox();
      const first = script.post(attempt(1, { idempotencyKey: key }));
      expect(first.ok).toBe(true);
      expect(script.row(script.teams, 0)['Chave de envio']).toBe('');
      expect(script.post(attempt(1, { idempotencyKey: key }))).toEqual(first);
      expect(script.post(attempt(2, { idempotencyKey: key }))).toMatchObject({
        error: 'duplicate_team_name',
      });
    },
  );
});

// troca da versão do aviso de privacidade sem derrubar inscrição: o script aceita a vigente (v5) e a anterior (v4,
// de quem abriu a página antes do deploy do site) e recusa qualquer outra
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, person, registrationBody } from '../../helpers/apps-script/sandbox';

const send = (consentVersion: unknown, participant: Record<string, unknown> = {}) => {
  const script = new AppsScriptSandbox();
  const res = script.post(registrationBody(participant, { consentVersion }));
  return { script, res };
};

describe('Apps Script · versões do aviso de privacidade aceitas', () => {
  it.each(['2026-10-v5', '2026-10-v4'])(
    'aceita o aceite da versão %s e grava a versão que a pessoa viu',
    (version) => {
      const { script, res } = send(version);
      expect(res.ok).toBe(true);
      expect(script.row(script.registrations, 0)['Consentimento']).toBe(
        `${version} · 2026-10-20T15:00:00.000Z`,
      );
    },
  );

  it.each(['2026-10-v3', '2026-10-v6', '2026-10-V5', '', ' 2026-10-v5 x', undefined, 5])(
    'recusa o aceite da versão %j e não grava nada',
    (version) => {
      const { script, res } = send(version);
      expect(res).toEqual({ ok: false, error: 'invalid' });
      expect(script.book.sheets).toHaveLength(0);
    },
  );

  it('uma pessoa que enviou pela v4 e outra pela v5 entram as duas, cada uma com o seu aceite', () => {
    const script = new AppsScriptSandbox();
    const a = script.post(registrationBody({}, { consentVersion: '2026-10-v4' }));
    const b = script.post({ ...person(2), consentVersion: '2026-10-v5' });
    expect([a.ok, b.ok]).toEqual([true, true]);
    expect(script.row(script.registrations, 0)['Consentimento']).toContain('2026-10-v4');
    expect(script.row(script.registrations, 1)['Consentimento']).toContain('2026-10-v5');
  });
});

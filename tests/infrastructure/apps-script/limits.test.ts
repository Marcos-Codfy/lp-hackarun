// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, otherTeam, registrationBody } from '../../helpers/apps-script/sandbox';

// cada envio é outra equipe inteira, pra não cair nas regras de nome, e-mail ou matrícula repetidos
const bodyFor = (i: number) => otherTeam(i + 10);

describe('Apps Script · prazo e capacidade em tempo de execução', () => {
  it('INSCRICOES_FECHADAS=sim fecha na mão', () => {
    const script = new AppsScriptSandbox();
    script.properties['INSCRICOES_FECHADAS'] = 'Sim';
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'closed' });
  });

  it('CLOSES_AT no passado fecha; no futuro deixa passar', () => {
    const script = new AppsScriptSandbox();
    script.properties['CLOSES_AT'] = '2026-11-08T23:59:00-03:00';
    expect(script.post(registrationBody()).ok).toBe(true);
    script.now = Date.parse('2026-11-09T00:00:00-03:00');
    expect(script.post(bodyFor(1))).toEqual({ ok: false, error: 'closed' });
  });

  it('propriedade torta fecha (lado seguro) e aparece no log', () => {
    const script = new AppsScriptSandbox();
    script.properties['CLOSES_AT'] = '8 de novembro';
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'closed' });
    script.properties['CLOSES_AT'] = '';
    script.properties['CAPACITY'] = 'trinta';
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'closed' });
    expect(script.errors).toHaveLength(2);
  });

  it('CAPACITY conta só equipes que não foram recusadas', () => {
    const script = new AppsScriptSandbox();
    script.properties['CAPACITY'] = '2';
    script.seed([
      { Protocolo: 'HR26-AAAAAA', Equipe: 'Alfa', Status: 'confirmado' },
      { Protocolo: 'HR26-BBBBBB', Equipe: 'Beta', Status: 'Recusado' },
    ]);
    expect(script.post(registrationBody()).ok).toBe(true);
    expect(script.post(bodyFor(1))).toEqual({ ok: false, error: 'closed' });
  });

  it('health mostra se a configuração deixa as inscrições abertas', () => {
    const script = new AppsScriptSandbox();
    expect(script.get('health')).toEqual({ ok: true, open: true });
    script.properties['CLOSES_AT'] = '2026-10-01T00:00:00-03:00';
    expect(script.get('health')).toEqual({ ok: true, open: false });
  });
});

describe('Apps Script · limite de envios', () => {
  it('o mesmo e-mail de contato tem um teto de tentativas por janela de 10 min', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', Equipe: 'Bug Busters', Status: 'pendente' }]);
    const max = script.evaluate<number>('EMAIL_MAX_ATTEMPTS');
    const attempt = (i: number) => script.post(registrationBody({ submittedAt: `tentativa-${i}` })).error;
    const errors = Array.from({ length: max + 1 }, (_, i) => attempt(i));
    expect(errors.slice(0, max).every((e) => e === 'duplicate_team_name')).toBe(true);
    expect(errors[max]).toBe('rate-limited');
    script.now += 10 * 60_000;
    expect(attempt(max + 1)).toBe('duplicate_team_name');
  });

  it('um e-mail martelando não esgota o balde global de todo mundo', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', Equipe: 'Bug Busters', Status: 'pendente' }]);
    for (let i = 0; i < 200; i++) script.post(registrationBody({ submittedAt: `tentativa-${i}` }));
    expect(script.post(bodyFor(1)).ok).toBe(true);
  });

  it('o balde global segura muitos e-mails diferentes no mesmo minuto e libera no seguinte', () => {
    const script = new AppsScriptSandbox();
    const limit = script.evaluate<number>('GLOBAL_MAX_PER_MINUTE');
    for (let i = 0; i < limit; i++) expect(script.post(bodyFor(i)).ok).toBe(true);
    expect(script.post(bodyFor(limit))).toEqual({ ok: false, error: 'rate-limited' });
    script.now += 60_000;
    expect(script.post(bodyFor(limit)).ok).toBe(true);
  });

  it('fila travada (lock ocupado) vira "rate-limited"', () => {
    const script = new AppsScriptSandbox();
    script.lock.busy = true;
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'rate-limited' });
  });
});

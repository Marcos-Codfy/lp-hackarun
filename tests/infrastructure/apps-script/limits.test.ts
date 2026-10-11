// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, registrationBody } from '../../helpers/apps-script/sandbox';

const leader = registrationBody()['leader'] as Record<string, unknown>;
// cada envio com um líder diferente, pra não cair na regra de e-mail repetido
const bodyFor = (i: number) =>
  registrationBody({ leader: { ...leader, email: `pessoa${i}@exemplo.com` }, members: [], mode: 'solo' });

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
      { Protocolo: 'HR26-AAAAAA', Modalidade: 'Equipe', 'E-mail': 'a@x.com', Status: 'confirmado' },
      { Protocolo: 'HR26-BBBBBB', Modalidade: 'Equipe', 'E-mail': 'b@x.com', Status: 'Recusado' },
      { Protocolo: 'HR26-CCCCCC', Modalidade: 'Individual', 'E-mail': 'c@x.com', Status: 'pendente' },
    ]);
    expect(script.post(registrationBody()).ok).toBe(true);
    // lotou: vale pra equipe e pra individual
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
  it('o mesmo e-mail tem um teto de tentativas por janela de 10 min', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', 'E-mail': 'ana@exemplo.com' }]);
    const max = script.evaluate<number>('EMAIL_MAX_ATTEMPTS');
    const attempt = (i: number) => script.post(registrationBody({ submittedAt: `tentativa-${i}` })).error;
    const errors = Array.from({ length: max + 1 }, (_, i) => attempt(i));
    expect(errors.slice(0, max).every((e) => e === 'duplicate')).toBe(true);
    expect(errors[max]).toBe('rate-limited');
    script.now += 10 * 60_000;
    expect(attempt(max + 1)).toBe('duplicate');
  });

  it('um e-mail martelando não esgota o balde global de todo mundo', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', 'E-mail': 'ana@exemplo.com' }]);
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

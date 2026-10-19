// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, person, registrationBody } from '../../helpers/apps-script/sandbox';

describe('Apps Script · prazo e capacidade em tempo de execução', () => {
  it('INSCRICOES_FECHADAS=sim fecha na mão; "nao" deixa passar', () => {
    const script = new AppsScriptSandbox();
    script.properties['INSCRICOES_FECHADAS'] = ' Sim ';
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'closed' });
    expect(script.book.sheets).toHaveLength(0);
    script.properties['INSCRICOES_FECHADAS'] = 'nao';
    expect(script.post(registrationBody()).ok).toBe(true);
  });

  it('CLOSES_AT: até o minuto final passa, depois fecha', () => {
    const script = new AppsScriptSandbox();
    script.properties['CLOSES_AT'] = '2026-11-08T23:59:00-03:00';
    script.now = Date.parse('2026-11-08T23:58:59-03:00');
    expect(script.post(registrationBody()).ok).toBe(true);
    script.now = Date.parse('2026-11-08T23:59:00-03:00');
    expect(script.post(person(1))).toEqual({ ok: false, error: 'closed' });
  });

  it('propriedade torta fecha (lado seguro) e aparece no log', () => {
    const script = new AppsScriptSandbox();
    script.properties['CLOSES_AT'] = '8 de novembro';
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'closed' });
    script.properties['CLOSES_AT'] = '';
    script.properties['CAPACITY'] = 'setenta e cinco';
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'closed' });
    expect(script.errors).toHaveLength(2);
  });

  it('CAPACITY conta pessoas e só as que não cancelaram', () => {
    const script = new AppsScriptSandbox();
    script.properties['CAPACITY'] = '2';
    script.seed([
      { Protocolo: 'HR26-AAAAAA', 'E-mail': 'a@exemplo.com', Status: 'credenciado' },
      { Protocolo: 'HR26-BBBBBB', 'E-mail': 'b@exemplo.com', Status: 'Cancelado' },
      // anotação sem protocolo não ocupa vaga
      { 'Nome completo': 'Anotação' },
    ]);
    expect(script.post(registrationBody()).ok).toBe(true);
    expect(script.post(person(1))).toEqual({ ok: false, error: 'closed' });
    // cancelou uma: a vaga volta
    script.edit(script.registrations, 0, 'Status', 'cancelado');
    expect(script.post(person(1)).ok).toBe(true);
  });

  it('health mostra se a configuração deixa as inscrições abertas', () => {
    const script = new AppsScriptSandbox();
    expect(script.get('health')).toEqual({ ok: true, open: true });
    script.properties['CLOSES_AT'] = '2026-10-01T00:00:00-03:00';
    expect(script.get('health')).toEqual({ ok: true, open: false });
  });
});

describe('Apps Script · vagas ocupadas (?action=slots)', () => {
  it('sem planilha nem CAPACITY: aberto, sem limite e ninguém inscrito, sem criar aba', () => {
    const script = new AppsScriptSandbox();
    expect(script.get('slots')).toEqual({ ok: true, open: true, capacity: null, taken: 0 });
    expect(script.book.sheets).toHaveLength(0);
  });

  it('conta inscrições ativas e fecha quando lota', () => {
    const script = new AppsScriptSandbox();
    script.properties['CAPACITY'] = '3';
    script.seed([
      { Protocolo: 'HR26-AAAAAA', Status: 'inscrito' },
      { Protocolo: 'HR26-BBBBBB', Status: 'cancelado' },
    ]);
    expect(script.get('slots')).toEqual({ ok: true, open: true, capacity: 3, taken: 1 });
    script.cache.store.clear();
    script.properties['CAPACITY'] = '1';
    expect(script.get('slots')).toEqual({ ok: true, open: false, capacity: 1, taken: 1 });
  });

  it('usa o cache; nova inscrição limpa ele na hora', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', Status: 'inscrito' }]);
    expect(script.get('slots').taken).toBe(1);
    script.registrations.appendRow(['HR26-BBBBBB']);
    // escrito à mão sem onEdit: o cache segura a contagem
    expect(script.get('slots').taken).toBe(1);
    expect(script.post(registrationBody()).ok).toBe(true);
    expect(script.get('slots').taken).toBe(3);
  });

  it('o onEdit do Status da aba Inscritos limpa o cache; outra coluna não', () => {
    const script = new AppsScriptSandbox();
    const { registrations } = script.seed([{ Protocolo: 'HR26-AAAAAA', Status: 'inscrito' }]);
    expect(script.get('slots').taken).toBe(1);
    script.edit(registrations, 0, 'Status', 'cancelado');
    script.onEdit(registrations, 'Curso');
    expect(script.get('slots').taken).toBe(1);
    script.onEdit(registrations, 'Status');
    expect(script.get('slots').taken).toBe(0);
  });

  it('INSCRICOES_FECHADAS vale na hora, mesmo com a contagem em cache', () => {
    const script = new AppsScriptSandbox();
    expect(script.get('slots').open).toBe(true);
    script.properties['INSCRICOES_FECHADAS'] = 'sim';
    expect(script.get('slots').open).toBe(false);
  });

  it('CAPACITY torta: fechado e capacity null (nunca NaN no JSON)', () => {
    const script = new AppsScriptSandbox();
    script.properties['CAPACITY'] = '-5';
    expect(script.get('slots')).toEqual({ ok: true, open: false, capacity: null, taken: 0 });
  });

  it('aba Inscritos com outro layout não é contada', () => {
    const script = new AppsScriptSandbox();
    script.book.insertSheet('Inscritos').appendRow(['Nome', 'Telefone']);
    script.tab('Inscritos').appendRow(['Fulano', '123']);
    expect(script.get('slots').taken).toBe(0);
  });
});

describe('Apps Script · limite de envios', () => {
  it('o mesmo e-mail tem um teto de tentativas por janela de 10 min', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', 'E-mail': 'ana@exemplo.com', Status: 'inscrito' }]);
    const max = script.evaluate<number>('EMAIL_MAX_ATTEMPTS');
    const attempt = (i: number) => script.post(registrationBody({}, { submittedAt: `tentativa-${i}` })).error;
    const errors = Array.from({ length: max + 1 }, (_, i) => attempt(i));
    expect(errors.slice(0, max).every((e) => e === 'duplicate_email')).toBe(true);
    expect(errors[max]).toBe('rate-limited');
    script.now += 10 * 60_000;
    expect(attempt(max + 1)).toBe('duplicate_email');
  });

  it('um e-mail martelando não esgota o balde global de todo mundo', () => {
    const script = new AppsScriptSandbox();
    for (let i = 0; i < 200; i++) script.post(registrationBody({}, { submittedAt: `tentativa-${i}` }));
    expect(script.post(person(1)).ok).toBe(true);
  });

  it('o balde global segura muitos e-mails diferentes no mesmo minuto e libera no seguinte', () => {
    const script = new AppsScriptSandbox();
    const limit = script.evaluate<number>('GLOBAL_MAX_PER_MINUTE');
    for (let i = 0; i < limit; i++) expect(script.post(person(i + 10)).ok).toBe(true);
    expect(script.post(person(limit + 10))).toEqual({ ok: false, error: 'rate-limited' });
    script.now += 60_000;
    expect(script.post(person(limit + 10)).ok).toBe(true);
  });

  it('fila travada (lock ocupado) vira "rate-limited"', () => {
    const script = new AppsScriptSandbox();
    script.lock.busy = true;
    expect(script.post(registrationBody())).toEqual({ ok: false, error: 'rate-limited' });
  });
});

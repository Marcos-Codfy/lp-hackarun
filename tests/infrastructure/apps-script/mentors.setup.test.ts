// cadastro de mentores no Apps Script: fechar o cadastro, a fila e o configurarMentores
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, mentorBody } from '../../helpers/apps-script/sandbox';
import { MENTOR_TITLES, mentors, rowsOf, seeded, snapshot } from '../../helpers/apps-script/mentorSheet';

describe('Apps Script · cadastro de mentores: fechar e a fila', () => {
  it('MENTORES_FECHADOS=sim responde "closed" sem gravar, e apagar a propriedade reabre', () => {
    const script = new AppsScriptSandbox();
    script.properties['MENTORES_FECHADOS'] = 'sim';
    expect(script.post(mentorBody())).toEqual({ ok: false, error: 'closed' });
    expect(script.book.sheets).toHaveLength(0);
    delete script.properties['MENTORES_FECHADOS'];
    expect(script.post(mentorBody()).ok).toBe(true);
  });

  it('só "sim" fecha (qualquer outro valor deixa aberto)', () => {
    const script = new AppsScriptSandbox();
    script.properties['MENTORES_FECHADOS'] = 'nao';
    expect(script.post(mentorBody()).ok).toBe(true);
  });

  it('fila cheia (lock ocupado) devolve rate-limited e não grava', () => {
    const script = new AppsScriptSandbox();
    script.lock.busy = true;
    expect(script.post(mentorBody())).toEqual({ ok: false, error: 'rate-limited' });
    expect(script.book.sheets).toHaveLength(0);
  });

  it('solta o lock e grava antes de soltar (o próximo da fila já enxerga a linha)', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody());
    expect(script.lock.held).toBe(false);
    expect(script.flushes).toContain(true);
  });
});

describe('Apps Script · configurarMentores', () => {
  it('cria as duas abas, pode rodar de novo sem duplicar nada e não apaga cadastro', () => {
    const script = new AppsScriptSandbox();
    script.evaluate('configurarMentores()');
    script.post(mentorBody());
    script.evaluate('configurarMentores()');
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Mentores', 'Resumo Mentores']);
    expect(rowsOf(script)).toHaveLength(1);
    const sheet = mentors(script);
    expect(sheet.bandings.length).toBeLessThanOrEqual(1);
    expect(
      sheet.protections.filter((p) => p.description === 'HackaRun · títulos (o script usa esses nomes)'),
    ).toHaveLength(1);
  });

  it('a aba tem menu de status com as cinco opções', () => {
    // a letra da coluna Status sai dos títulos (A = 65)
    const statusColumn = String.fromCharCode(65 + MENTOR_TITLES.indexOf('Status'));
    const script = new AppsScriptSandbox();
    script.evaluate('configurarMentores()');
    const spec = mentors(script).validations.find((v) => v.a1.startsWith(`${statusColumn}2`))?.rule as Record<
      string,
      unknown[]
    >;
    expect(spec['requireValueInList']?.[0]).toEqual([
      'novo',
      'contatado',
      'confirmado',
      'recusado',
      'cancelado',
    ]);
  });

  it('não mexe nas abas das inscrições nem na versão delas', () => {
    const { script, before } = seeded();
    script.evaluate('configurarMentores()');
    expect(snapshot(script)).toBe(before);
    expect(script.properties['PLANILHA_VERSAO']).toBe('7');
  });

  it('o Resumo Mentores tem contadores, listas para copiar e o passo a passo, todos lendo a aba Mentores', () => {
    const script = new AppsScriptSandbox();
    script.evaluate('configurarMentores()');
    const summary = script.tab('Resumo Mentores');
    // a linha 1 é o título; `data` começa na 2
    expect(summary.rows[0]?.[0]).toBe('HackaRun 2026 · Resumo dos mentores');
    const texts = summary.data.map((row) => String(row[0]));
    expect(texts).toContain('Cadastros ativos');
    expect(texts).toContain('Egressos da UniCatólica (ativos)');
    expect(texts).toContain('Área: Cibersegurança');
    expect(texts).toContain('Disponível em 13/11 (sex)');
    expect(texts).toContain('E-mails dos mentores ativos');
    expect(texts).toContain('Fechar o cadastro');
    const formulas = [...summary.formulas.values()];
    expect(formulas.length).toBeGreaterThan(20);
    expect(formulas.every((f) => f.includes("'Mentores'!"))).toBe(true);
    expect(summary.protections.length).toBe(1);
  });
});

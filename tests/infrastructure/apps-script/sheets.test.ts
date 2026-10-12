// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FakeSheet } from '../../helpers/apps-script/sheetFakes';
import { AppsScriptSandbox, registrationBody } from '../../helpers/apps-script/sandbox';

const configure = (script: AppsScriptSandbox) => script.evaluate<() => unknown>('configurarPlanilha')();

describe('Apps Script · planilha organizada', () => {
  it('configurarPlanilha cria Equipes, Integrantes e Resumo, renomeando a "Página1" vazia', () => {
    const script = new AppsScriptSandbox();
    script.book.add(new FakeSheet('Página1'));
    configure(script);
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Equipes', 'Integrantes', 'Resumo']);
    expect(script.teams.rows[0]).toEqual(script.evaluate('TEAM_HEADERS'));
    expect(script.members.rows[0]).toEqual([
      'Protocolo',
      'Equipe',
      'Nº',
      'Nome completo',
      'Matrícula',
      'E-mail',
      'Contato',
      'Status da equipe',
    ]);
    expect(script.properties['PLANILHA_VERSAO']).toBe(script.evaluate('SETUP_VERSION'));
    // também autoriza o Drive: pasta das fotos e segredo dos ids públicos prontos antes da 1ª inscrição
    expect(script.drive.folders.size).toBe(1);
    expect(script.properties['ID_SEGREDO']).toBeTruthy();
  });

  it('aba com dados que se chama "Página1" não é renomeada', () => {
    const script = new AppsScriptSandbox();
    script.book.add(new FakeSheet('Página1')).appendRow(['anotação da organização']);
    configure(script);
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Equipes', 'Integrantes', 'Resumo', 'Página1']);
  });

  it('formata as tabelas: congela título e equipe, filtro, faixas, status com menu e cores, títulos protegidos', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    const { teams, members } = script;
    expect(teams.frozen).toEqual({ rows: 1, columns: 3 });
    expect(members.frozen).toEqual({ rows: 1, columns: 2 });
    expect(teams.filter?.a1).toBe('A1:M1000');
    expect(members.filter?.a1).toBe('A1:H1000');
    expect(teams.bandings).toHaveLength(1);
    expect(teams.validations).toEqual([{ a1: 'F2:F1000', rule: expect.anything() }]);
    // 3 cores de status + a linha apagada das recusadas
    const formulas = teams.conditionalRules.map(
      (r) => (r as { spec: Record<string, unknown[]> }).spec['whenFormulaSatisfied']?.[0],
    );
    expect(formulas).toEqual([
      '=LOWER(TRIM($F2))="pendente"',
      '=LOWER(TRIM($F2))="confirmado"',
      '=LOWER(TRIM($F2))="recusado"',
      '=LOWER(TRIM($F2))="recusado"',
    ]);
    expect(members.conditionalRules).toHaveLength(4);
    expect(teams.protections).toEqual([
      expect.objectContaining({ type: 'RANGE', a1: 'A1:M1', warningOnly: true }),
    ]);
    const formats = teams.calls.filter((c) => c.method === 'setNumberFormat').map((c) => [c.a1, c.args[0]]);
    expect(formats).toContainEqual(['B2:B1000', 'dd/MM/yyyy HH:mm']);
    expect(members.calls.filter((c) => c.method === 'setNumberFormat').map((c) => c.a1)).toContain(
      'E2:E1000',
    );
  });

  it('rodar de novo não duplica filtro, faixa, proteção nem as regras de cor', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    configure(script);
    const { teams } = script;
    expect(teams.bandings).toHaveLength(1);
    expect(teams.protections).toHaveLength(1);
    expect(teams.conditionalRules).toHaveLength(4);
    expect(script.tab('Resumo').protections).toHaveLength(1);
    expect(script.book.sheets).toHaveLength(3);
  });

  it('a primeira inscrição monta a planilha sozinha (sem ter rodado o configurarPlanilha)', () => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody()).ok).toBe(true);
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Equipes', 'Integrantes', 'Resumo']);
    expect(script.teams.filter).not.toBeNull();
  });

  it('cada inscrição vira 1 linha em Equipes (com foto e link por fórmula) e 1 por pessoa em Integrantes', () => {
    const script = new AppsScriptSandbox();
    const { protocol } = script.post(registrationBody());
    const imageId = script.drive.allFiles[0]?.id;
    expect(script.row(script.teams, 0)['ID da foto']).toBe(imageId);
    expect(script.teams.formulaAt(2, 5)).toBe(
      '=IF(J2="","",IMAGE("https://lh3.googleusercontent.com/d/"&J2&"=w240"))',
    );
    expect(script.teams.formulaAt(2, 9)).toBe(
      '=IF(J2="","",HYPERLINK("https://drive.google.com/file/d/"&J2&"/view","Abrir no Drive"))',
    );
    expect(script.teams.rowHeights.get(2)).toBe(84);
    expect(script.members.data).toHaveLength(2);
    expect(script.row(script.members, 0)).toMatchObject({
      Protocolo: protocol,
      Equipe: 'Bug Busters',
      Nº: 1,
      'Nome completo': 'Ana Souza',
      Matrícula: '2024100123',
      'E-mail': 'ana@exemplo.com',
      Contato: 'sim',
    });
    expect(script.row(script.members, 1)).toMatchObject({ Nº: 2, Contato: 'não' });
    expect(script.members.formulaAt(3, 8)).toBe(
      "=IFERROR(INDEX('Equipes'!$F:$F,MATCH($A3,'Equipes'!$A:$A,0)),\"\")",
    );
  });

  it('o Resumo conta tudo por fórmula e junta os e-mails das confirmadas pra colar no e-mail', () => {
    const script = new AppsScriptSandbox();
    script.properties['CAPACITY'] = '30';
    configure(script);
    const summary = script.tab('Resumo');
    const label = (row: number) => summary.rows[row - 1]?.[0];
    expect(label(5)).toBe('Equipes inscritas');
    expect(summary.formulaAt(5, 2)).toBe("=COUNTA('Equipes'!A2:A)");
    expect(summary.formulaAt(6, 2)).toBe('=COUNTIF(\'Equipes\'!F2:F,"confirmado")');
    expect(summary.formulaAt(9, 2)).toBe("=SUM('Equipes'!D2:D)");
    expect(summary.rows[10]?.[1]).toBe(30);
    expect(summary.formulaAt(12, 2)).toBe('=IF(ISNUMBER(B11),MAX(0,B11-(B5-B8)),"sem limite")');
    expect(label(14)).toBe('E-mails das equipes confirmadas');
    expect(summary.formulaAt(14, 2)).toBe(
      '=IFERROR(TEXTJOIN("; ",TRUE,FILTER(\'Equipes\'!H2:H,LOWER(TRIM(\'Equipes\'!F2:F))="confirmado")),"Nenhuma equipe confirmada ainda.")',
    );
    const howto = summary.rows.map((r) => String(r[1] ?? '')).join(' ');
    expect(howto).toContain('Copie a célula B14');
    expect(summary.protections).toEqual([expect.objectContaining({ type: 'SHEET', warningOnly: true })]);
  });

  it('versão nova do layout refaz a formatação na próxima inscrição', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    script.properties['PLANILHA_VERSAO'] = '1';
    script.teams.calls.length = 0;
    script.post(registrationBody());
    expect(script.teams.calls.some((c) => c.method === 'setFontWeight')).toBe(true);
    expect(script.properties['PLANILHA_VERSAO']).toBe(script.evaluate('SETUP_VERSION'));
  });
});

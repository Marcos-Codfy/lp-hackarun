// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FakeSheet, type FakeRange } from '../../helpers/apps-script/sheetFakes';
import { AppsScriptSandbox, registrationBody } from '../../helpers/apps-script/sandbox';
import { configure, snapshot } from '../../helpers/apps-script/legacyLayout';

const REGISTRATION_TITLES = [
  'Protocolo',
  'Data/hora',
  'Nome completo',
  'E-mail',
  'WhatsApp',
  'Conversar',
  'Perfil',
  'Instituição',
  'Curso',
  'Período',
  'Matrícula',
  'Área',
  '18 anos ou mais',
  'Autorização do responsável',
  'Status',
  'Equipe',
  'Origem',
  'Consentimento',
  'Chave de envio',
];
const TEAM_TITLES = [
  'Equipe',
  'Insígnia',
  'Integrantes (qtd)',
  'Integrantes',
  'E-mails',
  'WhatsApps',
  'Status',
  'ID da insígnia',
  'Link da insígnia',
];

type Spec = Record<string, unknown[]>;
const validation = (sheet: FakeSheet, a1: string) => sheet.validations.find((v) => v.a1 === a1)?.rule as Spec;
const ruleFormulas = (sheet: FakeSheet) =>
  sheet.conditionalRules.map((r) => (r as { spec: Spec }).spec['whenFormulaSatisfied']?.[0]);

describe('Apps Script · configurarPlanilha monta as três abas', () => {
  it('cria Inscritos (a "Página1" vazia), Equipes e Resumo, com os títulos certos', () => {
    const script = new AppsScriptSandbox();
    script.book.add(new FakeSheet('Página1'));
    configure(script);
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Inscritos', 'Equipes', 'Resumo']);
    expect(script.registrations.rows[0]).toEqual(REGISTRATION_TITLES);
    expect(script.teams.rows[0]).toEqual(TEAM_TITLES);
    expect(script.properties['PLANILHA_VERSAO']).toBe('7');
    // também autoriza o Drive: pasta das insígnias e segredo dos ids públicos prontos antes do sorteio
    expect([...script.drive.folders.values()].map((f) => f.name)).toEqual([
      'HackaRun 2026 · Insígnias das equipes',
    ]);
    expect(script.properties['FOTOS_PASTA_ID']).toBe([...script.drive.folders.keys()][0]);
    expect(script.properties['ID_SEGREDO']).toBeTruthy();
  });

  it('aba com dados que se chama "Página1" não é renomeada', () => {
    const script = new AppsScriptSandbox();
    script.book.add(new FakeSheet('Página1')).appendRow(['anotação da organização']);
    configure(script);
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Inscritos', 'Equipes', 'Resumo', 'Página1']);
    expect(script.tab('Página1').rows).toEqual([['anotação da organização']]);
  });

  it('Inscritos: congela título e 3 colunas, filtro, faixas, cores de aba e títulos com aviso', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    const { registrations, teams, summary } = script;
    expect(registrations.frozen).toEqual({ rows: 1, columns: 3 });
    expect(teams.frozen).toEqual({ rows: 1, columns: 1 });
    expect(registrations.filter?.a1).toBe('A1:S1000');
    expect(teams.filter?.a1).toBe('A1:I1000');
    expect([registrations.tabColor, teams.tabColor, summary.tabColor]).toEqual([
      '#00E5FF',
      '#1264FF',
      '#941BFF',
    ]);
    expect(registrations.bandings).toHaveLength(1);
    expect(registrations.protections).toEqual([
      expect.objectContaining({ type: 'RANGE', a1: 'A1:S1', warningOnly: true }),
    ]);
    const formats = registrations.calls
      .filter((c) => c.method === 'setNumberFormat')
      .map((c) => [c.a1, c.args[0]]);
    expect(formats).toContainEqual(['B2:B1000', 'dd/MM/yyyy HH:mm']);
    // matrícula e WhatsApp como texto: zero à esquerda não some
    expect(formats).toContainEqual(['K2:K1000', '@']);
    expect(formats).toContainEqual(['E2:E1000', '@']);
  });

  it('menus: Status, Autorização e Equipe (só nomes da aba Equipes) recusam valor fora da lista', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    const { registrations, teams } = script;
    expect(validation(registrations, 'O2:O1000')['requireValueInList']?.[0]).toEqual([
      'inscrito',
      'credenciado',
      'ausente',
      'cancelado',
    ]);
    expect(validation(registrations, 'N2:N1000')['requireValueInList']?.[0]).toEqual([
      'pendente',
      'entregue',
      'não precisa',
    ]);
    const team = validation(registrations, 'P2:P1000');
    const source = team['requireValueInRange']?.[0] as FakeRange;
    expect([source.getSheet().name, source.getA1Notation()]).toEqual(['Equipes', 'A2:A1000']);
    expect(validation(teams, 'G2:G1000')['requireValueInList']?.[0]).toEqual(['pendente', 'confirmado']);
    [team, validation(registrations, 'O2:O1000'), validation(teams, 'G2:G1000')].forEach((rule) =>
      expect(rule['setAllowInvalid']).toEqual([false]),
    );
  });

  it('cores: cada status, autorização pendente/entregue e a linha cancelada apagada', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    expect(ruleFormulas(script.registrations)).toEqual([
      '=LOWER(TRIM($N2))="pendente"',
      '=LOWER(TRIM($N2))="entregue"',
      '=LOWER(TRIM($O2))="inscrito"',
      '=LOWER(TRIM($O2))="credenciado"',
      '=LOWER(TRIM($O2))="ausente"',
      '=LOWER(TRIM($O2))="cancelado"',
      '=LOWER(TRIM($O2))="cancelado"',
    ]);
    const dimmed = script.registrations.conditionalRules.at(-1) as { spec: Spec; getRanges(): FakeRange[] };
    expect(dimmed.getRanges().map((r) => r.getA1Notation())).toEqual(['A2:S1000']);
    expect(ruleFormulas(script.teams)).toEqual([
      '=LOWER(TRIM($G2))="pendente"',
      '=LOWER(TRIM($G2))="confirmado"',
    ]);
  });

  it('rodar de novo não duplica nada nem mexe nos dados; a regra de cor da organização fica', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    script.post(registrationBody());
    const orgRule = {
      getRanges: () => [script.registrations.getRange('I2:I1000')],
      getBooleanCondition: () => null,
    };
    script.registrations.setConditionalFormatRules([orgRule, ...script.registrations.conditionalRules]);
    const before = [snapshot(script.registrations), snapshot(script.teams)];
    configure(script);
    expect([snapshot(script.registrations), snapshot(script.teams)]).toEqual(before);
    expect(script.registrations.conditionalRules).toHaveLength(8);
    expect(script.registrations.conditionalRules[0]).toBe(orgRule);
    expect(script.registrations.bandings).toHaveLength(1);
    expect(script.registrations.protections).toHaveLength(1);
    expect(script.summary.protections).toHaveLength(1);
    expect(script.book.sheets).toHaveLength(3);
  });

  it('a primeira inscrição monta a planilha sozinha; versão nova do layout refaz a formatação', () => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody()).ok).toBe(true);
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Inscritos', 'Equipes', 'Resumo']);
    script.properties['PLANILHA_VERSAO'] = '6';
    script.registrations.calls.length = 0;
    script.post({
      ...registrationBody({ email: 'outra@exemplo.com', whatsapp: '63988887777', studentId: '' }),
    });
    expect(script.registrations.calls.some((c) => c.method === 'setFontWeight')).toBe(true);
    expect(script.properties['PLANILHA_VERSAO']).toBe('7');
  });

  it('configurarPlanilha entra na fila do lock e grava tudo (flush) antes de soltar', () => {
    const busy = new AppsScriptSandbox();
    busy.lock.busy = true;
    expect(() => configure(busy)).toThrow();
    expect(busy.book.sheets).toHaveLength(0);
    const script = new AppsScriptSandbox();
    configure(script);
    expect(script.flushes).toEqual([true]);
    expect(script.lock.held).toBe(false);
  });
});

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox } from '../../helpers/apps-script/sandbox';
import { configure } from '../../helpers/apps-script/legacyLayout';

function summaryOf(capacity?: string) {
  const script = new AppsScriptSandbox();
  if (capacity !== undefined) script.properties['CAPACITY'] = capacity;
  configure(script);
  const sheet = script.summary;
  // rótulo da coluna A -> [linha, valor ou fórmula da coluna B]
  const byLabel = new Map(
    sheet.rows.map((r, i) => [String(r[0] ?? ''), [i + 1, sheet.formulaAt(i + 1, 2) ?? r[1]] as const]),
  );
  return { sheet, byLabel, value: (label: string) => byLabel.get(label)?.[1] };
}

const ACTIVE = '\'Inscritos\'!A2:A,"<>",\'Inscritos\'!O2:O,"<>cancelado"';

describe('Apps Script · aba Resumo', () => {
  it('contadores ao vivo: ativas, vagas, credenciados, ausentes, cancelados, menores e autorizações', () => {
    const { value } = summaryOf('75');
    expect(value('Inscrições ativas')).toBe(`=COUNTIFS(${ACTIVE})`);
    expect(value('Vagas (propriedade CAPACITY)')).toBe(75);
    expect(value('Vagas restantes')).toBe('=IF(ISNUMBER(B6),MAX(0,B6-B5),"sem limite")');
    expect(value('Credenciados')).toBe('=COUNTIF(\'Inscritos\'!O2:O,"credenciado")');
    expect(value('Ausentes')).toBe('=COUNTIF(\'Inscritos\'!O2:O,"ausente")');
    expect(value('Cancelados')).toBe('=COUNTIF(\'Inscritos\'!O2:O,"cancelado")');
    expect(value('Credenciados ainda sem equipe')).toBe(
      '=COUNTIFS(\'Inscritos\'!O2:O,"credenciado",\'Inscritos\'!P2:P,"")',
    );
    expect(value('Menores de 18 anos (ativos)')).toBe(`=COUNTIFS(${ACTIVE},'Inscritos'!M2:M,"Não")`);
    expect(value('Autorizações pendentes')).toBe(`=COUNTIFS(${ACTIVE},'Inscritos'!N2:N,"pendente")`);
  });

  it('as referências da conta de vagas apontam para as linhas certas', () => {
    const { byLabel } = summaryOf('75');
    expect(byLabel.get('Inscrições ativas')?.[0]).toBe(5);
    expect(byLabel.get('Vagas (propriedade CAPACITY)')?.[0]).toBe(6);
  });

  it.each([
    [undefined, 'sem limite'],
    ['trinta', 'inválida (confira a propriedade CAPACITY)'],
  ])('CAPACITY %s aparece como "%s"', (capacity, label) => {
    expect(summaryOf(capacity).value('Vagas (propriedade CAPACITY)')).toBe(label);
  });

  it('uma linha por perfil, com o mesmo rótulo gravado na aba Inscritos', () => {
    const { value } = summaryOf();
    const labels = [
      'Estuda na UniCatólica',
      'Estuda em outra instituição',
      'Já se formou',
      'Trabalha ou estuda por conta própria',
    ];
    labels.forEach((label) =>
      expect(value(`Perfil: ${label}`)).toBe(`=COUNTIFS(${ACTIVE},'Inscritos'!G2:G,"${label}")`),
    );
  });

  it('listas prontas para colar: e-mails ativos, e-mails credenciados e WhatsApps ativos', () => {
    const { value } = summaryOf();
    const status = "LOWER(TRIM('Inscritos'!O2:O))";
    expect(value('E-mails das inscrições ativas')).toBe(
      `=IFERROR(TEXTJOIN("; ",TRUE,FILTER('Inscritos'!D2:D,'Inscritos'!A2:A<>"",${status}<>"cancelado")),"Nenhuma inscrição ainda.")`,
    );
    expect(value('E-mails dos credenciados')).toContain(`${status}="credenciado"`);
    expect(value('WhatsApps das inscrições ativas')).toContain(
      'TEXTJOIN(", ",TRUE,FILTER(\'Inscritos\'!E2:E,',
    );
  });

  it('por curso e por instituição: QUERY sem as canceladas, sem cabeçalho próprio', () => {
    const { sheet } = summaryOf();
    expect(sheet.rows[3]?.slice(3, 8)).toEqual([
      'Por curso',
      'Inscrições',
      '',
      'Por instituição',
      'Inscrições',
    ]);
    expect(sheet.formulaAt(5, 4)).toBe(
      "=IFERROR(QUERY('Inscritos'!A2:S,\"select I, count(A) where A <> '' and O <> 'cancelado' and I <> '' group by I order by count(A) desc label I '', count(A) ''\",0),\"Nenhuma inscrição ainda.\")",
    );
    expect(sheet.formulaAt(5, 7)).toContain('select H, count(A)');
  });

  it('o "Como usar" cobre o dia do evento e aponta as células certas das listas', () => {
    const { sheet, byLabel } = summaryOf();
    const howto = sheet.rows.map((r) => `${String(r[0] ?? '')}: ${String(r[1] ?? '')}`).join('\n');
    [
      'Credenciamento',
      'Menores de 18 anos',
      'Sorteio das equipes',
      'Insígnia',
      'Cancelar',
      'Não renomeie',
    ].forEach((topic) => expect(howto).toContain(`${topic}: `));
    expect(howto).toContain('credenciado');
    expect(howto).toContain('entregue');
    expect(howto).toContain('libera a vaga, o e-mail, o WhatsApp e a matrícula');
    const row = (label: string) => `B${byLabel.get(label)?.[0]}`;
    expect(howto).toContain(
      `Copie a célula ${row('E-mails das inscrições ativas')} ou ${row('E-mails dos credenciados')}`,
    );
    expect(howto).toContain(`A célula ${row('WhatsApps das inscrições ativas')} junta os WhatsApps`);
  });

  it('é protegida só com aviso e refeita do zero a cada configurar', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    script.summary.getRange(40, 1).setValue('anotação perdida');
    configure(script);
    expect(script.summary.rows[39]?.[0]).toBeUndefined();
    expect(script.summary.protections).toEqual([
      expect.objectContaining({ type: 'SHEET', warningOnly: true }),
    ]);
  });
});

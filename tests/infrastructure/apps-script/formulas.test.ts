// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, registrationBody } from '../../helpers/apps-script/sandbox';
import { configure } from '../../helpers/apps-script/legacyLayout';

describe('Apps Script · fórmulas do script', () => {
  it('cada inscrição ganha o link do WhatsApp montado da própria linha', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody());
    expect(script.registrations.formulaAt(2, 6)).toBe(
      '=IF(E2="","",HYPERLINK("https://wa.me/55"&REGEXREPLACE(TO_TEXT(E2),"\\D",""),"Abrir WhatsApp"))',
    );
  });

  it('Equipes: 30 linhas prontas com contagem, nomes, e-mails, WhatsApps, insígnia e link', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    const { teams } = script;
    const active = 'LOWER(TRIM(\'Inscritos\'!O2:O))<>"cancelado"';
    const join = (col: string, sep: string) =>
      `=IF($A2="","",IFERROR(TEXTJOIN(${sep},TRUE,FILTER('Inscritos'!${col}2:${col},'Inscritos'!P2:P=$A2,${active})),""))`;
    expect(teams.formulaAt(2, 3)).toBe(
      '=IF($A2="","",COUNTIFS(\'Inscritos\'!P2:P,$A2,\'Inscritos\'!O2:O,"<>cancelado"))',
    );
    expect(teams.formulaAt(2, 4)).toBe(join('C', 'CHAR(10)'));
    expect(teams.formulaAt(2, 5)).toBe(join('D', '"; "'));
    expect(teams.formulaAt(2, 6)).toBe(join('E', '", "'));
    expect(teams.formulaAt(2, 2)).toBe(
      '=IF(H2="","",IMAGE("https://lh3.googleusercontent.com/d/"&H2&"=w240"))',
    );
    expect(teams.formulaAt(2, 9)).toBe(
      '=IF(H2="","",HYPERLINK("https://drive.google.com/file/d/"&H2&"/view","Abrir no Drive"))',
    );
    expect(teams.formulaAt(31, 3)).toContain('$A31');
    expect(teams.formulaAt(32, 3)).toBeUndefined();
    // Equipe, Status e ID da insígnia ficam livres pra organização
    [1, 7, 8].forEach((col) => expect(teams.formulaAt(2, col)).toBeUndefined());
    expect(teams.rowHeights.get(31)).toBe(84);
  });

  it('equipe criada além da linha 31 ganha as fórmulas no próximo configurar', () => {
    const script = new AppsScriptSandbox();
    configure(script);
    script.teams.getRange(35, 1).setValue('Equipe Mewtwo');
    configure(script);
    expect(script.teams.formulaAt(35, 3)).toContain('$A35');
    expect(script.teams.rowHeights.get(35)).toBe(84);
  });

  it('planilha em pt_BR: argumentos com ";" e a vírgula dentro de texto fica', () => {
    const script = new AppsScriptSandbox();
    script.book.locale = 'pt_BR';
    script.post(registrationBody());
    expect(script.registrations.formulaAt(2, 6)).toBe(
      '=IF(E2="";"";HYPERLINK("https://wa.me/55"&REGEXREPLACE(TO_TEXT(E2);"\\D";"");"Abrir WhatsApp"))',
    );
    expect(script.teams.formulaAt(2, 6)).toContain('TEXTJOIN(", ";TRUE;FILTER(');
    expect(script.summary.formulaAt(5, 2)).toBe(
      '=COUNTIFS(\'Inscritos\'!A2:A;"<>";\'Inscritos\'!O2:O;"<>cancelado")',
    );
    // o texto do QUERY tem vírgula dentro das aspas: fica como está
    expect(script.summary.formulaAt(5, 4)).toContain("label I '', count(A) ''\";0)");
  });

  it('configurar conserta fórmula quebrada das linhas que já existem', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody());
    script.registrations.formulas.set('2,6', '=HYPERLINK("quebrada")');
    configure(script);
    expect(script.registrations.formulaAt(2, 6)).toContain('https://wa.me/55');
  });

  it.each([
    ['=SUM(1,2)', ';', '=SUM(1;2)'],
    ['=IF(A1="a,b","x,y",B1)', ';', '=IF(A1="a,b";"x,y";B1)'],
    ['=QUERY(A:B,"select A, B",0)', ';', '=QUERY(A:B;"select A, B";0)'],
    ['=SUM(1,2)', ',', '=SUM(1,2)'],
  ])('localizeFormula_(%s, "%s") = %s', (formula, separator, expected) => {
    const localize = new AppsScriptSandbox().evaluate<(f: string, s: string) => string>('localizeFormula_');
    expect(localize(formula, separator)).toBe(expected);
  });

  it.each([
    ['en_US', ','],
    ['en_GB', ','],
    ['ja_JP', ','],
    ['pt_BR', ';'],
    ['es_ES', ';'],
    ['de_DE', ';'],
  ])('idioma %s usa "%s" entre argumentos', (locale, separator) => {
    const script = new AppsScriptSandbox();
    script.book.locale = locale;
    expect(script.evaluate('formulaSeparator_()')).toBe(separator);
  });

  it.each([
    ['=1+1', "'=1+1"],
    ['+5563', "'+5563"],
    ['-x', "'-x"],
    ['@user', "'@user"],
    ['Ana', 'Ana'],
    [' =1', ' =1'],
    ['', ''],
  ])('sheetSafe_(%j) = %j', (value, expected) => {
    expect(new AppsScriptSandbox().evaluate<(v: unknown) => string>('sheetSafe_')(value)).toBe(expected);
  });
});

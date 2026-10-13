// a planilha como o layout 5 deixou, antes da coluna Integrantes na aba Equipes: pra testar a migração
import { AppsScriptSandbox } from './sandbox';
import { FakeSheet, type Cell, type FakeRange } from './sheetFakes';

type Row = Record<string, Cell>;
interface Column {
  key: string;
  title: string;
}
type Styler = (sheet: FakeSheet, ...args: unknown[]) => void;

export const PHOTO_A = '1AbCdEfGhIjKlMnOpQrStUvWxYz_-0A1';
export const PHOTO_B = '1AbCdEfGhIjKlMnOpQrStUvWxYz_-0B2';

const team = (protocol: string, name: string, status: string, emails: string[], photo: string) => ({
  Protocolo: protocol,
  'Data/hora': new Date('2026-10-12T10:00:00-03:00'),
  Equipe: name,
  'Integrantes (qtd)': emails.length,
  Status: status,
  'E-mail de contato': emails[0] ?? '',
  'E-mails da equipe': emails.join('; '),
  'ID da foto': photo,
  Origem: 'landing-page',
  Consentimento: '2026-10-v3 · 2026-10-12T13:00:00.000Z',
  'Chave de envio': `chave-${protocol}`,
});

// as 2 equipes e os 4 integrantes de teste que a planilha de verdade já tem
export const LEGACY_TEAMS = [
  team('HR26-AAAAAA', 'Bug Busters', 'pendente', ['ana@exemplo.com', 'bruno@exemplo.com'], PHOTO_A),
  team('HR26-BBBBBB', 'Os Brabos', 'confirmado', ['carla@exemplo.com', 'davi@exemplo.com'], PHOTO_B),
];

const member = (protocol: string, order: number, name: string, studentId: string, email: string) => ({
  Protocolo: protocol,
  Nº: order,
  'Nome completo': name,
  Matrícula: studentId,
  'E-mail': email,
  Contato: order === 1 ? 'sim' : 'não',
});

// fora de ordem de propósito (o Nº manda) e uma matrícula com o apóstrofo do sheetSafe_
export const LEGACY_MEMBERS = [
  member('HR26-AAAAAA', 1, 'Ana Souza', '2024100123', 'ana@exemplo.com'),
  member('HR26-BBBBBB', 2, 'Davi Rocha', "'-0042", 'davi@exemplo.com'),
  member('HR26-AAAAAA', 2, 'Bruno Lima', '2024100456', 'bruno@exemplo.com'),
  member('HR26-BBBBBB', 1, 'Carla Dias', 'RA-0001', 'carla@exemplo.com'),
];

// a célula Integrantes que cada equipe acima deve ganhar
export const ROSTER_A =
  '1. Ana Souza · 2024100123 · ana@exemplo.com (contato)\n2. Bruno Lima · 2024100456 · bruno@exemplo.com';
export const ROSTER_B =
  '1. Carla Dias · RA-0001 · carla@exemplo.com (contato)\n2. Davi Rocha · -0042 · davi@exemplo.com';

export interface LegacyBook {
  script: AppsScriptSandbox;
  teams: FakeSheet;
  members: FakeSheet;
  summary: FakeSheet;
}

// formatada pelas funções do próprio script com a lista de colunas daquela versão (filtro, faixas, aviso e cores
// em A:M), fórmulas de foto e link apontando pro ID da foto em J, Resumo com o e-mail em H e PLANILHA_VERSAO=5.
// Em pt_BR, como a planilha de verdade
export function legacyBook(teams: Row[] = LEGACY_TEAMS, members: Row[] = LEGACY_MEMBERS): LegacyBook {
  const script = new AppsScriptSandbox();
  script.book.locale = 'pt_BR';
  const style = script.evaluate<Styler>('styleTable_');
  const status = script.evaluate<Styler>('styleStatus_');
  const fill = (name: string, columns: Column[], rows: Row[]) => {
    const sheet = script.book.add(new FakeSheet(name));
    style(sheet, columns, name === 'Equipes' ? 3 : 2, '#000000');
    rows.forEach((row) => sheet.appendRow(columns.map((c) => row[c.title] ?? '')));
    return sheet;
  };
  const columns = script.evaluate<Column[]>("TEAM_COLUMNS.filter((c) => c.key !== 'roster')");
  const teamsSheet = fill('Equipes', columns, teams);
  status(teamsSheet, 5, columns.length, true);
  teams.forEach((_, i) => {
    const r = i + 2;
    const photo = `=IF(J${r}="";"";IMAGE("https://lh3.googleusercontent.com/d/"&J${r}&"=w240"))`;
    const link = `=IF(J${r}="";"";HYPERLINK("https://drive.google.com/file/d/"&J${r}&"/view";"Abrir no Drive"))`;
    teamsSheet.getRange(r, 5).setFormula(photo);
    teamsSheet.getRange(r, 9).setFormula(link);
    teamsSheet.setRowHeight(r, 84);
  });
  const membersSheet = fill('Integrantes', script.evaluate<Column[]>('MEMBER_COLUMNS'), members);
  status(membersSheet, 7, 8, false);
  members.forEach((_, i) => {
    const r = i + 2;
    const lookup = `=IFERROR(INDEX('Equipes'!$F:$F;MATCH($A${r};'Equipes'!$A:$A;0));"")`;
    membersSheet.getRange(r, 8).setFormula(lookup);
  });
  const summary = script.book.add(new FakeSheet('Resumo'));
  summary.getRange(14, 2).setFormula(`=IFERROR(TEXTJOIN("; ";TRUE;FILTER('Equipes'!H2:H;TRUE));"")`);
  script.properties['PLANILHA_VERSAO'] = '5';
  return { script, teams: teamsSheet, members: membersSheet, summary };
}

export const configure = (script: AppsScriptSandbox) =>
  script.evaluate<() => unknown>('configurarPlanilha')();

// intervalos de cada regra de cor da aba, em A1
export const ruleRanges = (sheet: FakeSheet) =>
  sheet.conditionalRules.map((r) =>
    (r as { getRanges(): FakeRange[] }).getRanges().map((range) => range.getA1Notation()),
  );

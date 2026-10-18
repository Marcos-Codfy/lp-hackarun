// a planilha como a inscrição por equipe (layout 6) deixou: abas Equipes, Integrantes e Resumo, com filtro,
// aviso dos títulos e fórmulas. Serve pra testar que a migração guarda tudo com outro nome e não apaga nada
import { AppsScriptSandbox } from './sandbox';
import { FakeSheet, type Cell } from './sheetFakes';

export const LEGACY_TEAM_HEADERS = [
  'Protocolo',
  'Data/hora',
  'Equipe',
  'Integrantes (qtd)',
  'Foto',
  'Status',
  'Integrantes',
  'E-mail de contato',
  'E-mails da equipe',
  'Link da foto',
  'ID da foto',
  'Origem',
  'Consentimento',
  'Chave de envio',
];
export const LEGACY_MEMBER_HEADERS = [
  'Protocolo',
  'Equipe',
  'Nº',
  'Nome completo',
  'Matrícula',
  'E-mail',
  'Contato',
  'Status da equipe',
];

const date = new Date('2026-10-12T10:00:00-03:00');
// prettier-ignore
export const LEGACY_TEAM_ROWS: Cell[][] = [
  ['HR26-AAAAAA', date, 'Bug Busters', 2, '', 'pendente', '1. Ana Souza · 2024100123 · ana@exemplo.com (contato)',
    'ana@exemplo.com', 'ana@exemplo.com; bruno@exemplo.com', '', '1AbCdEfGhIjKlMnOpQrStUvWxYz_-0A1', 'landing-page',
    '2026-10-v3 · 2026-10-12T13:00:00.000Z', 'chave-HR26-AAAAAA'],
  ['HR26-BBBBBB', date, 'Os Brabos', 2, '', 'confirmado', '1. Carla Dias · RA-0001 · carla@exemplo.com (contato)',
    'carla@exemplo.com', 'carla@exemplo.com; davi@exemplo.com', '', '1AbCdEfGhIjKlMnOpQrStUvWxYz_-0B2', 'landing-page',
    '2026-10-v3 · 2026-10-12T13:00:00.000Z', 'chave-HR26-BBBBBB'],
];
// prettier-ignore
export const LEGACY_MEMBER_ROWS: Cell[][] = [
  ['HR26-AAAAAA', 'Bug Busters', 1, 'Ana Souza', '2024100123', 'ana@exemplo.com', 'sim', ''],
  ['HR26-AAAAAA', 'Bug Busters', 2, 'Bruno Lima', '2024100456', 'bruno@exemplo.com', 'não', ''],
  ['HR26-BBBBBB', 'Os Brabos', 1, 'Carla Dias', 'RA-0001', 'carla@exemplo.com', 'sim', ''],
];

export interface LegacyBook {
  script: AppsScriptSandbox;
  teams: FakeSheet;
  members: FakeSheet;
  summary: FakeSheet;
}

// em pt_BR, como a planilha de verdade, com PLANILHA_VERSAO=6
export function legacyBook(): LegacyBook {
  const script = new AppsScriptSandbox();
  script.book.locale = 'pt_BR';
  const fill = (name: string, headers: string[], rows: Cell[][]) => {
    const sheet = script.book.add(new FakeSheet(name));
    sheet.appendRow(headers);
    rows.forEach((row) => sheet.appendRow(row));
    sheet.getRange(1, 1, 1000, headers.length).createFilter();
    sheet
      .getRange(1, 1, 1, headers.length)
      .protect()
      .setDescription('HackaRun · títulos (o script usa esses nomes)');
    return sheet;
  };
  const teams = fill('Equipes', LEGACY_TEAM_HEADERS, LEGACY_TEAM_ROWS);
  LEGACY_TEAM_ROWS.forEach((_, i) =>
    teams
      .getRange(i + 2, 5)
      .setFormula(`=IF(K${i + 2}="";"";IMAGE("https://lh3.googleusercontent.com/d/"&K${i + 2}))`),
  );
  const members = fill('Integrantes', LEGACY_MEMBER_HEADERS, LEGACY_MEMBER_ROWS);
  const summary = script.book.add(new FakeSheet('Resumo'));
  summary.getRange(1, 1).setValue('HackaRun 2026 · Resumo das inscrições');
  summary.getRange(5, 2).setFormula("=COUNTA('Equipes'!A2:A)");
  script.properties['PLANILHA_VERSAO'] = '6';
  return { script, teams, members, summary };
}

export const configure = (script: AppsScriptSandbox) =>
  script.evaluate<() => unknown>('configurarPlanilha')();

// o que o teste compara entre uma rodada e outra: valores e fórmulas
export const snapshot = (sheet: FakeSheet) => JSON.stringify([sheet.rows, [...sheet.formulas].sort()]);

// monta e formata a planilha: abas, títulos, filtros, Status com menu e cores, faixas alternadas e proteção.
// Pode rodar quantas vezes quiser (não apaga dado nem duplica filtro, faixa ou proteção)

// subiu o layout? suba a versão: a próxima inscrição refaz a formatação sozinha
const SETUP_VERSION = '4';
const SETUP_PROPERTY = 'PLANILHA_VERSAO';
// primeira aba vazia de planilha nova ("Página1", "Sheet1"...) vira a aba Equipes
const DEFAULT_SHEET_NAME = /^(p[áa]gina|sheet|planilha|folha|hoja|feuille)\s*1$/i;
const BRAND = { night: '#060B24', ice: '#F5F8FF', white: '#FFFFFF', band: '#F2F5FF', dim: '#5B6275' };
// [fundo, texto]: contraste AA nos três
const STATUS_STYLES = {
  pendente: ['#FFF1CC', '#6B4400'],
  confirmado: ['#D9F5E8', '#0B5A38'],
  recusado: ['#FDE1E8', '#8A1530'],
};
const HEADER_PROTECTION = 'HackaRun · títulos (o script usa esses nomes)';

// rode uma vez no editor (selecione configurarPlanilha e clique em Executar): cria as abas, autoriza a
// planilha e o Drive, cria a pasta das fotos e o segredo dos ids públicos
function configurarPlanilha() {
  const tabs = setupBook_(SpreadsheetApp.getActiveSpreadsheet(), readConfig_());
  idSecret_();
  const folder = imageFolder_();
  console.log('Planilha pronta: abas ' + [TEAMS_SHEET, MEMBERS_SHEET, SUMMARY_SHEET].join(', ') + '.');
  console.log('Pasta das fotos: ' + folder.getUrl());
  return tabs;
}

// planilha nova ou layout de uma versão anterior: a primeira gravação monta tudo sozinha
function workbook_(config) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const teams = book.getSheetByName(TEAMS_SHEET);
  const members = book.getSheetByName(MEMBERS_SHEET);
  if (teams && members && config.setupVersion === SETUP_VERSION) return { teams: teams, members: members };
  return setupBook_(book, config);
}

function setupBook_(book, config) {
  const teams = ensureTab_(book, TEAMS_SHEET, 0);
  const members = ensureTab_(book, MEMBERS_SHEET, 1);
  const summary = ensureTab_(book, SUMMARY_SHEET, 2);
  styleTable_(teams, TEAM_COLUMNS, 3, '#1264FF');
  styleTable_(members, MEMBER_COLUMNS, 2, '#00E5FF');
  styleStatus_(teams, COL.status, TEAM_COLUMNS.length, true);
  styleStatus_(members, MCOL.status, MEMBER_COLUMNS.length, false);
  const last = teams.getLastRow();
  if (last > 1) teams.setRowHeights(2, last - 1, PHOTO_ROW_HEIGHT);
  writeSummary_(summary, config);
  PropertiesService.getScriptProperties().setProperty(SETUP_PROPERTY, SETUP_VERSION);
  return { teams: teams, members: members };
}

function ensureTab_(book, name, position) {
  const existing = book.getSheetByName(name);
  if (existing) return existing;
  if (name === TEAMS_SHEET) {
    const blank = book
      .getSheets()
      .find((s) => DEFAULT_SHEET_NAME.test(s.getName()) && s.getLastRow() === 0 && s.getLastColumn() === 0);
    if (blank) return blank.setName(name);
  }
  return book.insertSheet(name, Math.min(position, book.getSheets().length));
}

function styleTable_(sheet, columns, frozenColumns, tabColor) {
  const width = columns.length;
  const rows = sheet.getMaxRows();
  const header = sheet.getRange(1, 1, 1, width);
  header
    .setValues([columns.map((c) => c.title)])
    .setFontWeight('bold')
    .setFontColor(BRAND.ice)
    .setBackground(BRAND.night)
    .setWrap(true)
    .setVerticalAlignment('middle');
  sheet.setRowHeight(1, 40);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(frozenColumns);
  sheet.setTabColor(tabColor);
  columns.forEach((column, i) => {
    sheet.setColumnWidth(i + 1, column.width);
    const body = sheet.getRange(2, i + 1, rows - 1, 1).setVerticalAlignment('middle');
    if (column.format) body.setNumberFormat(column.format);
    if (column.align) body.setHorizontalAlignment(column.align);
    if (column.wrap) body.setWrap(true);
  });
  // filtro básico em todas as linhas (as novas já entram nele)
  if (!sheet.getFilter()) sheet.getRange(1, 1, rows, width).createFilter();
  if (sheet.getBandings().length === 0) {
    sheet
      .getRange(1, 1, rows, width)
      .applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false)
      .setHeaderRowColor(BRAND.night)
      .setFirstRowColor(BRAND.white)
      .setSecondRowColor(BRAND.band);
  }
  const protectedAlready = sheet
    .getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .some((p) => p.getDescription() === HEADER_PROTECTION);
  // só avisa: a organização ainda consegue mexer, mas pensa duas vezes
  if (!protectedAlready) header.protect().setDescription(HEADER_PROTECTION).setWarningOnly(true);
}

// menu suspenso (só na aba Equipes) + cor por status nas duas abas; equipe recusada fica apagada
function styleStatus_(sheet, col, width, withDropdown) {
  const rows = sheet.getMaxRows() - 1;
  const range = sheet.getRange(2, col + 1, rows, 1);
  const cell = '$' + colLetter_(col) + '2';
  if (withDropdown) {
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(STATUS_OPTIONS, true)
      .setAllowInvalid(false)
      .setHelpText('Escolha pendente, confirmado ou recusado.')
      .build();
    range.setDataValidation(rule);
  }
  const ours = STATUS_OPTIONS.map((status) =>
    SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=LOWER(TRIM(' + cell + '))="' + status + '"')
      .setBackground(STATUS_STYLES[status][0])
      .setFontColor(STATUS_STYLES[status][1])
      .setBold(true)
      .setRanges([range])
      .build(),
  );
  const dimmed = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=LOWER(TRIM(' + cell + '))="recusado"')
    .setFontColor(BRAND.dim)
    .setRanges([sheet.getRange(2, 1, rows, width)])
    .build();
  // regra que a organização criou em outra coluna fica; as do script são trocadas pelas novas
  const others = sheet.getConditionalFormatRules().filter((rule) => !isScriptRule_(rule, col + 1, width));
  sheet.setConditionalFormatRules(others.concat(ours, [dimmed]));
}

// as do script: a coluna Status ou a linha inteira (A2 até a última coluna da tabela)
function isScriptRule_(rule, statusColumn, width) {
  const wholeRow = (r) => r.getColumn() === 1 && r.getRow() === 2 && r.getNumColumns() === width;
  return rule
    .getRanges()
    .some((r) => (r.getColumn() === statusColumn && r.getNumColumns() === 1) || wholeRow(r));
}

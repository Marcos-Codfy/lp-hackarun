// monta e formata a planilha: abas, títulos, filtros, Status com menu e cores, faixas alternadas e proteção.
// Pode rodar quantas vezes quiser (não apaga dado nem duplica filtro, faixa ou proteção)

// subiu o layout? suba a versão: a próxima inscrição refaz a formatação sozinha
const SETUP_VERSION = '6';
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
// regra de cor do script pela fórmula (=LOWER(TRIM($F2))="pendente"), em inglês ou no idioma da planilha
const STATUS_RULE_FORMULA = /\(\$[A-Z]{1,3}2\)\)\s*=\s*"(pendente|confirmado|recusado)"$/;

// rode uma vez no editor (selecione configurarPlanilha e clique em Executar): cria as abas, autoriza a
// planilha e o Drive, cria a pasta das fotos e o segredo dos ids públicos
function configurarPlanilha() {
  // a mesma fila do doPost: inscrição chegando no meio da migração espera, não grava na coluna errada
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  let tabs;
  let folder;
  try {
    tabs = setupBook_(SpreadsheetApp.getActiveSpreadsheet(), readConfig_());
    idSecret_();
    folder = imageFolder_();
    // grava tudo antes de soltar o lock: quem está na fila já lê a planilha migrada
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  console.log('Planilha pronta: abas ' + [TEAMS_SHEET, MEMBERS_SHEET, SUMMARY_SHEET].join(', ') + '.');
  console.log('Pasta das fotos: ' + folder.getUrl());
  return tabs;
}

// planilha nova ou layout de uma versão anterior: a primeira gravação monta tudo sozinha
function workbook_(config) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const teams = book.getSheetByName(TEAMS_SHEET);
  const members = book.getSheetByName(MEMBERS_SHEET);
  // a config foi lida antes do lock: quem esperou na fila confere a versão de novo
  const ready =
    config.setupVersion === SETUP_VERSION ||
    String(PropertiesService.getScriptProperties().getProperty(SETUP_PROPERTY) || '') === SETUP_VERSION;
  if (teams && members && ready) return { teams: teams, members: members };
  return setupBook_(book, config);
}

function setupBook_(book, config) {
  const teams = ensureTab_(book, TEAMS_SHEET, 0);
  const members = ensureTab_(book, MEMBERS_SHEET, 1);
  const summary = ensureTab_(book, SUMMARY_SHEET, 2);
  addRosterColumn_(teams);
  styleTable_(teams, TEAM_COLUMNS, 3, '#1264FF');
  styleTable_(members, MEMBER_COLUMNS, 2, '#00E5FF');
  styleStatus_(teams, COL.status, TEAM_COLUMNS.length, true);
  styleStatus_(members, MCOL.status, MEMBER_COLUMNS.length, false);
  const last = teams.getLastRow();
  if (last > 1) teams.setRowHeights(2, last - 1, PHOTO_ROW_HEIGHT);
  writeSummary_(summary, config);
  fillRosters_(teams, members);
  refreshFormulas_(teams, members);
  PropertiesService.getScriptProperties().setProperty(SETUP_PROPERTY, SETUP_VERSION);
  // layout novo: a lista pública não fica com a leitura do layout antigo
  CacheService.getScriptCache().remove(TEAMS_CACHE_KEY);
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

// layout 5 -> 6: a coluna Integrantes entra logo depois do Status como coluna de verdade (insertColumnAfter),
// então os dados da direita andam junto e nada é sobrescrito. Só reconhece o layout 5 (depois do Status vinha o
// E-mail de contato): planilha já migrada ou com outro formato não ganha coluna
function addRosterColumn_(sheet) {
  const width = sheet.getLastColumn();
  if (width <= COL.roster) return;
  const header = sheet
    .getRange(1, 1, 1, width)
    .getValues()[0]
    .map((v) => String(v).trim());
  const title = (key) => TEAM_COLUMNS[COL[key]].title;
  const legacy = header[COL.status] === title('status') && header[COL.roster] === title('contact');
  if (!legacy) return;
  sheet.insertColumnAfter(COL.status + 1);
  // título na hora: se algo cair depois daqui, a coluna já tem nome e rodar de novo não insere outra
  // (depois do Status deixou de vir o E-mail de contato, então o layout 5 não é mais reconhecido)
  sheet.getRange(1, COL.roster + 1).setValue(title('roster'));
  // a coluna nova herda o formato e o menu do Status; o styleTable_ formata ela do zero
  sheet
    .getRange(2, COL.roster + 1, sheet.getMaxRows() - 1, 1)
    .clearDataValidations()
    .clearFormat();
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
    if (column.fontSize) body.setFontSize(column.fontSize);
  });
  coverTable_(sheet, header, sheet.getRange(1, 1, rows, width));
}

// filtro, faixas e aviso dos títulos cobrindo a tabela toda, inclusive depois de uma coluna nova
function coverTable_(sheet, header, table) {
  const width = table.getNumColumns();
  // filtro básico em todas as linhas (as novas já entram nele). Estreito demais é refeito: os dados ficam,
  // só os critérios aplicados no filtro somem
  const filter = sheet.getFilter();
  const covers = filter && filter.getRange().getLastColumn() >= width;
  if (filter && !covers) filter.remove();
  if (!covers) table.createFilter();
  const banding = sheet.getBandings()[0];
  if (!banding) {
    table
      .applyRowBanding(SpreadsheetApp.BandingTheme.BLUE, true, false)
      .setHeaderRowColor(BRAND.night)
      .setFirstRowColor(BRAND.white)
      .setSecondRowColor(BRAND.band);
  } else if (banding.getRange().getLastColumn() < width) banding.setRange(table);
  const protection = sheet
    .getProtections(SpreadsheetApp.ProtectionType.RANGE)
    .find((p) => p.getDescription() === HEADER_PROTECTION);
  // só avisa: a organização ainda consegue mexer, mas pensa duas vezes
  if (!protection) header.protect().setDescription(HEADER_PROTECTION).setWarningOnly(true);
  else if (protection.getRange().getLastColumn() < width) protection.setRange(header);
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

// as do script: a coluna Status, a linha inteira (A2 até a última coluna da tabela) ou a fórmula de status
// (coluna inserida pode ter esticado o intervalo de uma regra antiga)
function isScriptRule_(rule, statusColumn, width) {
  const wholeRow = (r) => r.getColumn() === 1 && r.getRow() === 2 && r.getNumColumns() === width;
  const byRange = rule
    .getRanges()
    .some((r) => (r.getColumn() === statusColumn && r.getNumColumns() === 1) || wholeRow(r));
  const condition = rule.getBooleanCondition();
  const formula = condition ? String(condition.getCriteriaValues()[0] || '') : '';
  return byRange || STATUS_RULE_FORMULA.test(formula);
}

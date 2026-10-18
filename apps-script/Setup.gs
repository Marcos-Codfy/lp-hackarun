// monta e formata a planilha: abas, títulos, filtros, menus com cores, faixas alternadas e proteção.
// Pode rodar quantas vezes quiser (não apaga dado nem duplica filtro, faixa ou proteção)

// subiu o layout? suba a versão: a próxima inscrição refaz a formatação sozinha
const SETUP_VERSION = '7';
const SETUP_PROPERTY = 'PLANILHA_VERSAO';
// primeira aba vazia de planilha nova ("Página1", "Sheet1"...) vira a aba Inscritos
const DEFAULT_SHEET_NAME = /^(p[áa]gina|sheet|planilha|folha|hoja|feuille)\s*1$/i;
// abas da inscrição por equipe (layout 6 ou anterior): ficam guardadas com outro nome, nunca apagadas
const LEGACY_TABS = ['Equipes', 'Integrantes'];
const LEGACY_SUFFIX = ' (inscrição antiga)';
// prettier-ignore
const BRAND = {
  night: '#060B24', ice: '#F5F8FF', white: '#FFFFFF', band: '#F2F5FF', dim: '#5B6275',
  cyan: '#00E5FF', blue: '#1264FF', violet: '#941BFF',
};
// [fundo, texto]: contraste AA em todos
const CHOICE_STYLES = {
  inscrito: ['#E3ECFF', '#1A3A8A'],
  credenciado: ['#D9F5E8', '#0B5A38'],
  ausente: ['#FFF1CC', '#6B4400'],
  cancelado: ['#FDE1E8', '#8A1530'],
  pendente: ['#FFF1CC', '#6B4400'],
  entregue: ['#D9F5E8', '#0B5A38'],
  confirmado: ['#D9F5E8', '#0B5A38'],
};
const HEADER_PROTECTION = 'HackaRun · títulos (o script usa esses nomes)';
// regra de cor do script pela fórmula (=LOWER(TRIM($O2))="inscrito"), em inglês ou no idioma da planilha
const SCRIPT_RULE_FORMULA = /\(\$[A-Z]{1,3}2\)\)\s*=\s*"[^"]+"$/;

// rode uma vez no editor (selecione configurarPlanilha e clique em Executar): cria as abas, autoriza a
// planilha e o Drive, cria a pasta das insígnias e o segredo dos ids públicos
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
    // grava tudo antes de soltar o lock: quem está na fila já lê a planilha pronta
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  console.log('Planilha pronta: abas ' + [REGISTRATIONS_SHEET, TEAMS_SHEET, SUMMARY_SHEET].join(', ') + '.');
  console.log('Pasta das insígnias: ' + folder.getUrl());
  return tabs;
}

// planilha nova ou layout de uma versão anterior: a primeira gravação monta tudo sozinha
function workbook_(config) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const registrations = book.getSheetByName(REGISTRATIONS_SHEET);
  const teams = book.getSheetByName(TEAMS_SHEET);
  // a config foi lida antes do lock: quem esperou na fila confere a versão de novo
  const ready =
    config.setupVersion === SETUP_VERSION ||
    String(PropertiesService.getScriptProperties().getProperty(SETUP_PROPERTY) || '') === SETUP_VERSION;
  if (registrations && teams && ready) return { registrations: registrations, teams: teams };
  return setupBook_(book, config);
}

function setupBook_(book, config) {
  archiveLegacyTabs_(book);
  const registrations = ensureTab_(book, REGISTRATIONS_SHEET, 0);
  const teams = ensureTab_(book, TEAMS_SHEET, 1);
  const summary = ensureTab_(book, SUMMARY_SHEET, 2);
  styleTable_(registrations, REGISTRATION_COLUMNS, 3, BRAND.cyan);
  styleTable_(teams, TEAM_COLUMNS, 1, BRAND.blue);
  styleChoices_(registrations, REGISTRATION_COLUMNS.length, [
    { col: RCOL.guardian, options: GUARDIAN_OPTIONS, colored: ['pendente', 'entregue'] },
    { col: RCOL.status, options: STATUS_OPTIONS, colored: STATUS_OPTIONS, dims: 'cancelado' },
  ]);
  styleChoices_(teams, TEAM_COLUMNS.length, [
    { col: TCOL.status, options: TEAM_STATUS_OPTIONS, colored: TEAM_STATUS_OPTIONS },
  ]);
  teamDropdown_(registrations, teams);
  prepareTeamRows_(teams);
  for (let row = 2; row <= registrations.getLastRow(); row++) {
    setScriptFormula_(registrations.getRange(row, RCOL.chat + 1), chatFormula_(row));
  }
  writeSummary_(summary, config);
  PropertiesService.getScriptProperties().setProperty(SETUP_PROPERTY, SETUP_VERSION);
  // layout novo: as leituras públicas não ficam com o que veio do layout antigo
  const cache = CacheService.getScriptCache();
  cache.remove(TEAMS_CACHE_KEY);
  cache.remove(SLOTS_CACHE_KEY);
  return { registrations: registrations, teams: teams };
}

// aba Equipes ou Integrantes da inscrição por equipe (o 1º título é "Protocolo") muda de nome e fica intacta
function archiveLegacyTabs_(book) {
  LEGACY_TABS.forEach((name) => {
    const sheet = book.getSheetByName(name);
    if (!sheet || sheet.getLastColumn() === 0) return;
    if (String(sheet.getRange(1, 1).getValues()[0][0]).trim() !== 'Protocolo') return;
    let target = name + LEGACY_SUFFIX;
    for (let n = 2; book.getSheetByName(target); n++) target = name + LEGACY_SUFFIX + ' ' + n;
    sheet.setName(target);
  });
}

function ensureTab_(book, name, position) {
  const existing = book.getSheetByName(name);
  if (existing) return existing;
  if (name === REGISTRATIONS_SHEET) {
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
    if (column.fontSize) body.setFontSize(column.fontSize);
  });
  coverTable_(sheet, header, sheet.getRange(1, 1, rows, width));
}

// filtro, faixas e aviso dos títulos cobrindo a tabela toda
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

// menu suspenso + cor por opção em cada coluna de escolha; `dims` apaga a linha inteira (inscrição cancelada)
function styleChoices_(sheet, width, specs) {
  const rows = sheet.getMaxRows() - 1;
  const ours = [];
  specs.forEach((spec) => {
    const range = sheet.getRange(2, spec.col + 1, rows, 1);
    const cell = '$' + colLetter_(spec.col) + '2';
    const when = (option) => '=LOWER(TRIM(' + cell + '))="' + option + '"';
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(spec.options, true)
      .setAllowInvalid(false)
      .setHelpText('Escolha uma das opções: ' + spec.options.join(', ') + '.')
      .build();
    range.setDataValidation(rule);
    spec.colored.forEach((option) =>
      ours.push(
        SpreadsheetApp.newConditionalFormatRule()
          .whenFormulaSatisfied(when(option))
          .setBackground(CHOICE_STYLES[option][0])
          .setFontColor(CHOICE_STYLES[option][1])
          .setBold(true)
          .setRanges([range])
          .build(),
      ),
    );
    if (!spec.dims) return;
    ours.push(
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied(when(spec.dims))
        .setFontColor(BRAND.dim)
        .setItalic(true)
        .setRanges([sheet.getRange(2, 1, rows, width)])
        .build(),
    );
  });
  // regra que a organização criou em outra coluna fica; as do script são trocadas pelas novas
  const columns = specs.map((spec) => spec.col + 1);
  const others = sheet.getConditionalFormatRules().filter((rule) => !isScriptRule_(rule, columns, width));
  sheet.setConditionalFormatRules(others.concat(ours));
}

// as do script: numa coluna de escolha, na linha inteira (A2 até a última coluna) ou com a fórmula do script
function isScriptRule_(rule, columns, width) {
  const wholeRow = (r) => r.getColumn() === 1 && r.getRow() === 2 && r.getNumColumns() === width;
  const byRange = rule
    .getRanges()
    .some((r) => (columns.indexOf(r.getColumn()) >= 0 && r.getNumColumns() === 1) || wholeRow(r));
  const condition = rule.getBooleanCondition();
  const formula = condition ? String(condition.getCriteriaValues()[0] || '') : '';
  return byRange || SCRIPT_RULE_FORMULA.test(formula);
}

// coluna Equipe da aba Inscritos: só aceita um nome que existe na coluna Equipe da aba Equipes
function teamDropdown_(registrations, teams) {
  const names = teams.getRange(2, TCOL.name + 1, teams.getMaxRows() - 1, 1);
  const rule = SpreadsheetApp.newDataValidation()
    .requireValueInRange(names, true)
    .setAllowInvalid(false)
    .setHelpText('Escolha uma equipe criada na aba Equipes (coluna Equipe).')
    .build();
  registrations.getRange(2, RCOL.team + 1, registrations.getMaxRows() - 1, 1).setDataValidation(rule);
}

// fórmulas prontas em TEAM_ROWS linhas (mais, se a organização já passou disso) e altura pra miniatura
function prepareTeamRows_(teams) {
  const last = Math.max(TEAM_ROWS + 1, teams.getLastRow());
  for (let row = 2; row <= last; row++) {
    const formulas = teamFormulas_(row);
    Object.keys(formulas).forEach((col) =>
      setScriptFormula_(teams.getRange(row, Number(col) + 1), formulas[col]),
    );
  }
  teams.setRowHeights(2, last - 1, BADGE_ROW_HEIGHT);
}

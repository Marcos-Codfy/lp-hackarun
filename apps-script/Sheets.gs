// layout da planilha (abas e colunas) e a gravação de cada inscrição: uma linha por pessoa em "Inscritos".
// A aba "Equipes" é da organização (sorteio de 12/11): as colunas de integrantes saem por fórmula da aba Inscritos.
// Fórmulas do próprio script usam nomes em inglês e o separador de argumento do idioma da planilha (pt_BR usa
// ";", ver setScriptFormula_); o que a pessoa digitou passa pelo sheetSafe_

const REGISTRATIONS_SHEET = 'Inscritos';
const TEAMS_SHEET = 'Equipes';
const SUMMARY_SHEET = 'Resumo';
const STATUS_OPTIONS = ['inscrito', 'credenciado', 'ausente', 'cancelado'];
const GUARDIAN_OPTIONS = ['pendente', 'entregue', 'não precisa'];
const TEAM_STATUS_OPTIONS = ['pendente', 'confirmado'];
// equipes com fórmula pronta na aba Equipes (linhas 2 a 31); o configurarPlanilha estende se passar disso
const TEAM_ROWS = 30;
// a miniatura da insígnia aparece dentro da célula (=IMAGE); a linha cresce pra dar pra ver
const BADGE_ROW_HEIGHT = 84;
const BADGE_THUMB_WIDTH = 240;

// rótulos em pt-BR do que o site manda em código
const PROFILE_LABELS = {
  unicatolica: 'Estuda na UniCatólica',
  'other-institution': 'Estuda em outra instituição',
  graduate: 'Já se formou',
  'self-taught': 'Trabalha ou estuda por conta própria',
};
const AREA_LABELS = {
  development: 'Desenvolvimento',
  'data-ai': 'Dados e IA',
  design: 'Design e UX',
  infra: 'Redes e infraestrutura',
  security: 'Segurança',
  product: 'Produto e gestão',
  other: 'Outra',
};

// key = nome no código; title = título na planilha; format '@' = texto puro (matrícula 0012 não vira 12)
// prettier-ignore
const REGISTRATION_COLUMNS = [
  { key: 'protocol', title: 'Protocolo', width: 120 },
  { key: 'date', title: 'Data/hora', width: 130, format: 'dd/MM/yyyy HH:mm' },
  { key: 'name', title: 'Nome completo', width: 230, format: '@', wrap: true },
  { key: 'email', title: 'E-mail', width: 240, format: '@' },
  { key: 'whatsapp', title: 'WhatsApp', width: 140, format: '@' },
  { key: 'chat', title: 'Conversar', width: 130, align: 'center' },
  { key: 'profile', title: 'Perfil', width: 210, wrap: true },
  { key: 'institution', title: 'Instituição', width: 190, format: '@', wrap: true },
  { key: 'course', title: 'Curso', width: 210, format: '@', wrap: true },
  { key: 'period', title: 'Período', width: 80, format: '@', align: 'center' },
  { key: 'studentId', title: 'Matrícula', width: 130, format: '@' },
  { key: 'area', title: 'Área', width: 170, wrap: true },
  { key: 'adult', title: '18 anos ou mais', width: 100, align: 'center' },
  { key: 'guardian', title: 'Autorização do responsável', width: 150, align: 'center', wrap: true },
  { key: 'status', title: 'Status', width: 120, align: 'center' },
  { key: 'team', title: 'Equipe', width: 180 },
  { key: 'source', title: 'Origem', width: 110 },
  { key: 'consent', title: 'Consentimento', width: 240 },
  { key: 'key', title: 'Chave de envio', width: 200, format: '@' },
];
// prettier-ignore
const TEAM_COLUMNS = [
  { key: 'name', title: 'Equipe', width: 200, format: '@' },
  { key: 'badge', title: 'Insígnia', width: 96, align: 'center' },
  { key: 'count', title: 'Integrantes (qtd)', width: 100, format: '0', align: 'center' },
  { key: 'roster', title: 'Integrantes', width: 260, wrap: true, fontSize: 9 },
  { key: 'emails', title: 'E-mails', width: 300, wrap: true, fontSize: 9 },
  { key: 'phones', title: 'WhatsApps', width: 220, wrap: true, fontSize: 9 },
  { key: 'status', title: 'Status', width: 120, align: 'center' },
  { key: 'badgeId', title: 'ID da insígnia', width: 200, format: '@' },
  { key: 'link', title: 'Link da insígnia', width: 130 },
];
const REGISTRATION_HEADERS = REGISTRATION_COLUMNS.map((c) => c.title);
const TEAM_HEADERS = TEAM_COLUMNS.map((c) => c.title);
// posição (base 0) de cada coluna: RCOL.status, TCOL.badgeId...
const RCOL = columnIndex_(REGISTRATION_COLUMNS);
const TCOL = columnIndex_(TEAM_COLUMNS);

function columnIndex_(columns) {
  const index = {};
  columns.forEach((column, i) => (index[column.key] = i));
  return index;
}

// 0 -> A, 25 -> Z, 26 -> AA
function colLetter_(index) {
  let n = index + 1;
  let letters = '';
  while (n > 0) {
    const rest = (n - 1) % 26;
    letters = String.fromCharCode(65 + rest) + letters;
    n = Math.floor((n - 1) / 26);
  }
  return letters;
}

// uma leitura só por aba: duplicados, protocolo e capacidade saem do mesmo array
function readRows_(sheet, width) {
  const last = sheet.getLastRow();
  return last > 1 ? sheet.getRange(2, 1, last - 1, width).getValues() : [];
}

// a aba tem o layout atual? (aba antiga com o mesmo nome não é lida com as posições novas)
function hasHeaders_(sheet, headers) {
  if (!sheet || sheet.getLastColumn() < headers.length) return false;
  const found = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  return headers.every((title, i) => String(found[i]).trim() === title);
}

function appendRegistration_(sheet, protocol, data) {
  const p = data.participant;
  const row = sheet.getLastRow() + 1;
  const values = REGISTRATION_COLUMNS.map(() => '');
  values[RCOL.protocol] = protocol;
  values[RCOL.date] = new Date();
  values[RCOL.name] = sheetSafe_(p.name);
  values[RCOL.email] = sheetSafe_(p.email);
  values[RCOL.whatsapp] = p.whatsapp;
  values[RCOL.profile] = PROFILE_LABELS[p.profile];
  values[RCOL.institution] = sheetSafe_(p.institution);
  values[RCOL.course] = sheetSafe_(p.course);
  values[RCOL.period] = p.period ? p.period + 'º' : '';
  values[RCOL.studentId] = sheetSafe_(p.studentId);
  values[RCOL.area] = p.area ? AREA_LABELS[p.area] : '';
  values[RCOL.adult] = p.adult ? 'Sim' : 'Não';
  // menor de 18 leva a autorização do responsável no credenciamento (regulamento, 2.5)
  values[RCOL.guardian] = p.adult ? 'não precisa' : 'pendente';
  values[RCOL.status] = 'inscrito';
  values[RCOL.source] = sheetSafe_(data.source);
  values[RCOL.consent] = sheetSafe_(data.consent);
  values[RCOL.key] = data.idempotencyKey;
  sheet.appendRow(values);
  setScriptFormula_(sheet.getRange(row, RCOL.chat + 1), chatFormula_(row));
}

// link do WhatsApp montado da célula WhatsApp da mesma linha: corrigiu o número, o link acompanha
function chatFormula_(row) {
  const phone = colLetter_(RCOL.whatsapp) + row;
  const url = '"https://wa.me/55"&REGEXREPLACE(TO_TEXT(' + phone + '),"\\D","")';
  return '=IF(' + phone + '="","",HYPERLINK(' + url + ',"Abrir WhatsApp"))';
}

// referência a uma coluna da aba Inscritos, sem o título ('Inscritos'!P2:P)
function registrationsColumn_(key) {
  const letter = colLetter_(RCOL[key]);
  return "'" + REGISTRATIONS_SHEET + "'!" + letter + '2:' + letter;
}

// quem está na equipe desta linha e não cancelou. Linha sem nome de equipe fica em branco
function teamFormulas_(row) {
  const team = '$' + colLetter_(TCOL.name) + row;
  const active = 'LOWER(TRIM(' + registrationsColumn_('status') + '))<>"cancelado"';
  const members = registrationsColumn_('team') + '=' + team;
  const join = (key, separator) =>
    '=IF(' +
    team +
    '="","",IFERROR(TEXTJOIN(' +
    separator +
    ',TRUE,FILTER(' +
    registrationsColumn_(key) +
    ',' +
    members +
    ',' +
    active +
    ')),""))';
  const count =
    '=IF(' +
    team +
    '="","",COUNTIFS(' +
    registrationsColumn_('team') +
    ',' +
    team +
    ',' +
    registrationsColumn_('status') +
    ',"<>cancelado"))';
  const id = colLetter_(TCOL.badgeId) + row;
  const image = '"https://lh3.googleusercontent.com/d/"&' + id + '&"=w' + BADGE_THUMB_WIDTH + '"';
  const drive = '"https://drive.google.com/file/d/"&' + id + '&"/view"';
  const formulas = {};
  formulas[TCOL.count] = count;
  formulas[TCOL.roster] = join('name', 'CHAR(10)');
  formulas[TCOL.emails] = join('email', '"; "');
  formulas[TCOL.phones] = join('whatsapp', '", "');
  formulas[TCOL.badge] = '=IF(' + id + '="","",IMAGE(' + image + '))';
  formulas[TCOL.link] = '=IF(' + id + '="","",HYPERLINK(' + drive + ',"Abrir no Drive"))';
  return formulas;
}

// o setFormula lê a fórmula no idioma da planilha: em pt_BR (e nos idiomas de vírgula decimal) o argumento
// se separa com ";". Os nomes das funções seguem em inglês; só a vírgula fora das aspas muda
const COMMA_ARGUMENT_LOCALE = /^(en|ja|ko|zh|th|he|iw|hi|ms|fil|tl)(_|$)/i;
let formulaSeparatorCache_ = null;

function setScriptFormula_(range, formula) {
  range.setFormula(localizeFormula_(formula, formulaSeparator_()));
}

function formulaSeparator_() {
  if (formulaSeparatorCache_) return formulaSeparatorCache_;
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const locale = String((book && book.getSpreadsheetLocale && book.getSpreadsheetLocale()) || 'en_US');
  formulaSeparatorCache_ = COMMA_ARGUMENT_LOCALE.test(locale) ? ',' : ';';
  return formulaSeparatorCache_;
}

function localizeFormula_(formula, separator) {
  if (separator === ',') return formula;
  let quoted = false;
  let out = '';
  for (const ch of formula) {
    if (ch === '"') quoted = !quoted;
    out += ch === ',' && !quoted ? separator : ch;
  }
  return out;
}

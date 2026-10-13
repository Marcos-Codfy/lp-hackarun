// layout da planilha (abas e colunas) e a gravação de cada inscrição: uma linha por equipe em "Equipes"
// e uma por pessoa em "Integrantes". Fórmulas do próprio script usam nomes em inglês e o separador de argumento
// do idioma da planilha (pt_BR usa ";", ver setScriptFormula_); o que a pessoa digitou passa pelo sheetSafe_

const TEAMS_SHEET = 'Equipes';
const MEMBERS_SHEET = 'Integrantes';
const SUMMARY_SHEET = 'Resumo';
const STATUS_OPTIONS = ['pendente', 'confirmado', 'recusado'];
// a miniatura da foto aparece dentro da célula (=IMAGE); a linha cresce pra dar pra ver
const PHOTO_ROW_HEIGHT = 84;
const PHOTO_THUMB_WIDTH = 240;

// key = nome no código; title = título na planilha; format '@' = texto puro (matrícula 0012 não vira 12)
// prettier-ignore
const TEAM_COLUMNS = [
  { key: 'protocol', title: 'Protocolo', width: 120 },
  { key: 'date', title: 'Data/hora', width: 130, format: 'dd/MM/yyyy HH:mm' },
  { key: 'team', title: 'Equipe', width: 200, format: '@' },
  { key: 'size', title: 'Integrantes (qtd)', width: 100, format: '0', align: 'center' },
  { key: 'photo', title: 'Foto', width: 96, align: 'center' },
  { key: 'status', title: 'Status', width: 120, align: 'center' },
  // uma pessoa por linha na célula; com fonte 9 e 520 px quase todo mundo cabe sem quebrar. Nome ou e-mail
  // comprido quebra e a linha cresce além da altura da foto (o setRowHeight não trava): nada fica escondido
  { key: 'roster', title: 'Integrantes', width: 520, format: '@', wrap: true, fontSize: 9 },
  { key: 'contact', title: 'E-mail de contato', width: 230, format: '@' },
  { key: 'emails', title: 'E-mails da equipe', width: 360, format: '@', wrap: true },
  { key: 'link', title: 'Link da foto', width: 120 },
  { key: 'imageId', title: 'ID da foto', width: 200, format: '@' },
  { key: 'source', title: 'Origem', width: 110 },
  { key: 'consent', title: 'Consentimento', width: 240 },
  { key: 'key', title: 'Chave de envio', width: 200, format: '@' },
];
// prettier-ignore
const MEMBER_COLUMNS = [
  { key: 'protocol', title: 'Protocolo', width: 120 },
  { key: 'team', title: 'Equipe', width: 200, format: '@' },
  { key: 'order', title: 'Nº', width: 48, format: '0', align: 'center' },
  { key: 'name', title: 'Nome completo', width: 240, format: '@' },
  { key: 'studentId', title: 'Matrícula', width: 140, format: '@' },
  { key: 'email', title: 'E-mail', width: 240, format: '@' },
  { key: 'contact', title: 'Contato', width: 80, align: 'center' },
  { key: 'status', title: 'Status da equipe', width: 130, align: 'center' },
];
const TEAM_HEADERS = TEAM_COLUMNS.map((c) => c.title);
const MEMBER_HEADERS = MEMBER_COLUMNS.map((c) => c.title);
// posição (base 0) de cada coluna: COL.status, MCOL.email...
const COL = columnIndex_(TEAM_COLUMNS);
const MCOL = columnIndex_(MEMBER_COLUMNS);

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

// integrantes primeiro e a equipe por último: a linha da equipe é a que "vale". Se algo falhar no meio,
// integrante sem equipe é ignorado (o Registry.gs só conta protocolo que existe na aba Equipes)
function writeRegistration_(tabs, protocol, data, imageId) {
  appendMembers_(tabs.members, protocol, data);
  appendTeam_(tabs.teams, protocol, data, imageId);
}

function appendTeam_(sheet, protocol, data, imageId) {
  const row = sheet.getLastRow() + 1;
  const values = TEAM_COLUMNS.map(() => '');
  values[COL.protocol] = protocol;
  values[COL.date] = new Date();
  values[COL.team] = sheetSafe_(data.teamName);
  values[COL.size] = data.members.length;
  values[COL.status] = 'pendente';
  values[COL.roster] = sheetSafe_(rosterText_(data.members));
  values[COL.contact] = sheetSafe_(data.members[0].email);
  // "; " cola direto no campo Para do e-mail
  values[COL.emails] = sheetSafe_(data.members.map((m) => m.email).join('; '));
  values[COL.imageId] = imageId || '';
  values[COL.source] = sheetSafe_(data.source);
  values[COL.consent] = sheetSafe_(data.consent);
  values[COL.key] = data.idempotencyKey;
  sheet.appendRow(values);
  setScriptFormula_(sheet.getRange(row, COL.photo + 1), photoFormula_(row));
  setScriptFormula_(sheet.getRange(row, COL.link + 1), linkFormula_(row));
  sheet.setRowHeight(row, PHOTO_ROW_HEIGHT);
}

function appendMembers_(sheet, protocol, data) {
  const first = sheet.getLastRow() + 1;
  data.members.forEach((member, i) => {
    const values = MEMBER_COLUMNS.map(() => '');
    values[MCOL.protocol] = protocol;
    values[MCOL.team] = sheetSafe_(data.teamName);
    values[MCOL.order] = i + 1;
    values[MCOL.name] = sheetSafe_(member.name);
    values[MCOL.studentId] = sheetSafe_(member.studentId);
    values[MCOL.email] = sheetSafe_(member.email);
    values[MCOL.contact] = i === 0 ? 'sim' : 'não';
    sheet.appendRow(values);
    setScriptFormula_(sheet.getRange(first + i, MCOL.status + 1), memberStatusFormula_(first + i));
  });
}

// "1. Nome · Matrícula · E-mail (contato)", um por linha e na ordem da inscrição. Começa com o número,
// então nunca vira fórmula (o sheetSafe_ de quem chama fica de garantia); o clean_ já tirou as quebras de linha
function rosterText_(people) {
  return people
    .map((p, i) => i + 1 + '. ' + [p.name, p.studentId, p.email].join(' · ') + (i === 0 ? ' (contato)' : ''))
    .join('\n');
}

// célula Integrantes vazia (coluna recém-criada ou apagada à mão) é refeita a partir da aba Integrantes.
// Só escreve nas vazias, em blocos seguidos: a primeira migração preenche a coluna toda numa chamada
function fillRosters_(teams, members) {
  const rows = readRows_(teams, TEAM_HEADERS.length);
  const blank = (r) => String(r[COL.protocol]).trim() !== '' && String(r[COL.roster]).trim() === '';
  if (!rows.some(blank)) return;
  const people = peopleByProtocol_(members);
  let start = -1;
  let cells = [];
  const flush = () => {
    if (cells.length) teams.getRange(start + 2, COL.roster + 1, cells.length, 1).setValues(cells);
    cells = [];
  };
  rows.forEach((r, i) => {
    if (!blank(r)) return flush();
    if (!cells.length) start = i;
    const team = people[String(r[COL.protocol]).trim()] || [];
    cells.push([team.length ? sheetSafe_(rosterText_(team)) : '']);
  });
  flush();
}

// protocolo -> integrantes em ordem de Nº, sem o apóstrofo do sheetSafe_
function peopleByProtocol_(members) {
  const groups = {};
  readRows_(members, MEMBER_HEADERS.length).forEach((r) => {
    const protocol = String(r[MCOL.protocol]).trim();
    if (!protocol) return;
    (groups[protocol] = groups[protocol] || []).push(r);
  });
  const text = (value) => cellText_(value).trim();
  Object.keys(groups).forEach((protocol) => {
    groups[protocol] = groups[protocol]
      .sort((a, b) => (Number(a[MCOL.order]) || 0) - (Number(b[MCOL.order]) || 0))
      .map((r) => ({
        name: text(r[MCOL.name]),
        studentId: text(r[MCOL.studentId]),
        email: text(r[MCOL.email]),
      }));
  });
  return groups;
}

// a foto sai do ID da foto da mesma linha: apagou o ID (moderação), a miniatura some junto
function photoFormula_(row) {
  const id = colLetter_(COL.imageId) + row;
  const url = '"https://lh3.googleusercontent.com/d/"&' + id + '&"=w' + PHOTO_THUMB_WIDTH + '"';
  return '=IF(' + id + '="","",IMAGE(' + url + '))';
}

function linkFormula_(row) {
  const id = colLetter_(COL.imageId) + row;
  const url = '"https://drive.google.com/file/d/"&' + id + '&"/view"';
  return '=IF(' + id + '="","",HYPERLINK(' + url + ',"Abrir no Drive"))';
}

// status da equipe puxado da aba Equipes pelo protocolo: filtrar Integrantes por status funciona
function memberStatusFormula_(row) {
  const teams = "'" + TEAMS_SHEET + "'!";
  const status = colLetter_(COL.status);
  const protocol = colLetter_(COL.protocol);
  const key = '$' + colLetter_(MCOL.protocol) + row;
  const statusCol = teams + '$' + status + ':$' + status;
  const protocolCol = teams + '$' + protocol + ':$' + protocol;
  return '=IFERROR(INDEX(' + statusCol + ',MATCH(' + key + ',' + protocolCol + ',0)),"")';
}

// refaz as fórmulas das linhas que já existem (rodar o configurarPlanilha conserta uma planilha antiga)
function refreshFormulas_(teams, members) {
  for (let row = 2; row <= teams.getLastRow(); row++) {
    setScriptFormula_(teams.getRange(row, COL.photo + 1), photoFormula_(row));
    setScriptFormula_(teams.getRange(row, COL.link + 1), linkFormula_(row));
  }
  for (let row = 2; row <= members.getLastRow(); row++) {
    setScriptFormula_(members.getRange(row, MCOL.status + 1), memberStatusFormula_(row));
  }
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

// HackaRun 2026: Web App que grava as inscrições do site na planilha e publica as equipes confirmadas.
// Cole no editor do Apps Script da planilha (Extensões > Apps Script). Validações ficam em Validacao.gs.

const SHEET_NAME = 'Inscricoes';
const HEADERS = [
  'Protocolo', 'Data/hora', 'Modalidade', 'Equipe', 'Lider', 'E-mail', 'WhatsApp',
  'Curso', 'Periodo', 'Integrantes', 'Qtde', 'Acessibilidade', 'Status', 'Origem',
];
// posição (base 0) de cada coluna no array de HEADERS
const COL = { protocol: 0, mode: 2, team: 3, email: 5, course: 7, size: 10, status: 12 };
const STATUS_OPTIONS = ['pendente', 'confirmado', 'recusado'];
const TEAMS_CACHE_KEY = 'teams:v1';
const TEAMS_CACHE_SECONDS = 60;
const MAX_PER_MINUTE = 40;

function doPost(e) {
  const body = parseBody_(e);
  // robô: honeypot preenchido ou formulário enviado rápido demais
  if (!body || isBot_(body)) return json_({ ok: false, error: 'invalid' });
  if (registrationsClosed_()) return json_({ ok: false, error: 'closed' });
  const data = validateRegistration_(body);
  if (!data) return json_({ ok: false, error: 'invalid' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return json_({ ok: false, error: 'rate-limited' });
  }
  try {
    const cache = CacheService.getScriptCache();
    // retry do mesmo envio (mesmo e-mail + mesmo horário do cliente) recebe o mesmo protocolo
    const retryKey = 'sub:' + digest_(data.leader.email + '|' + String(body.submittedAt || ''));
    const previous = cache.get(retryKey);
    if (previous) return json_({ ok: true, protocol: previous });
    if (tooManyThisMinute_(cache)) return json_({ ok: false, error: 'rate-limited' });

    const sheet = getSheet_();
    if (leaderEmailExists_(sheet, data.leader.email)) return json_({ ok: false, error: 'duplicate' });
    const protocol = newProtocol_(sheet);
    sheet.appendRow(toRow_(protocol, data));
    cache.put(retryKey, protocol, 600);
    return json_({ ok: true, protocol: protocol });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';
  if (action === 'health') return json_({ ok: true });
  if (action === 'teams') return json_({ ok: true, teams: confirmedTeams_() });
  return json_({ ok: false, error: 'unknown-action' });
}

// gatilho simples: mudou a coluna Status, a lista pública atualiza na hora (sem esperar o cache)
function onEdit(e) {
  try {
    const range = e && e.range;
    if (!range || range.getSheet().getName() !== SHEET_NAME) return;
    const statusCol = COL.status + 1;
    if (range.getColumn() <= statusCol && range.getLastColumn() >= statusCol) {
      CacheService.getScriptCache().remove(TEAMS_CACHE_KEY);
    }
  } catch (err) {
    // gatilho simples não pode quebrar a edição da planilha
  }
}

// só o que é público: id derivado do protocolo, nome da equipe, curso e quantidade
function confirmedTeams_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(TEAMS_CACHE_KEY);
  if (hit) return JSON.parse(hit);
  const sheet = getSheet_();
  const last = sheet.getLastRow();
  const rows = last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
  const teams = rows
    .filter((r) => isConfirmed_(r[COL.status]) && String(r[COL.team]).trim())
    .map((r) => ({
      id: 'team-' + digest_(String(r[COL.protocol])).slice(0, 10),
      name: String(r[COL.team]).trim().slice(0, 40),
      course: String(r[COL.course]).trim().slice(0, 80) || null,
      memberCount: Number(r[COL.size]) || 1,
    }));
  cache.put(TEAMS_CACHE_KEY, JSON.stringify(teams), TEAMS_CACHE_SECONDS);
  return teams;
}

function getSheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (sheet) return sheet;
  sheet = book.insertSheet(SHEET_NAME);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight('bold');
  sheet.setFrozenRows(1);
  // dropdown na coluna Status pra organização confirmar sem digitar
  const rule = SpreadsheetApp.newDataValidation().requireValueInList(STATUS_OPTIONS, true).build();
  sheet.getRange(2, COL.status + 1, sheet.getMaxRows() - 1, 1).setDataValidation(rule);
  return sheet;
}

function leaderEmailExists_(sheet, email) {
  const last = sheet.getLastRow();
  if (last < 2) return false;
  const emails = sheet.getRange(2, COL.email + 1, last - 1, 1).getValues();
  return emails.some((row) => String(row[0]).trim().toLowerCase() === email);
}

// sem 0/O/1/I pra ninguém confundir ao ditar
function newProtocol_(sheet) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const last = sheet.getLastRow();
  const used = last > 1 ? sheet.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0])) : [];
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    const protocol = 'HR26-' + code;
    if (used.indexOf(protocol) === -1) return protocol;
  }
  throw new Error('Could not generate a unique protocol');
}

function toRow_(protocol, data) {
  const members = data.members.map((m) => m.name + ' <' + m.email + '>' + (m.course ? ' - ' + m.course : ''));
  return [
    protocol,
    new Date(),
    data.mode === 'team' ? 'Equipe' : 'Individual',
    sheetSafe_(data.teamName),
    sheetSafe_(data.leader.name),
    sheetSafe_(data.leader.email),
    sheetSafe_(data.leader.phone),
    sheetSafe_(data.leader.course),
    sheetSafe_(data.leader.semester),
    sheetSafe_(members.join('\n')),
    1 + data.members.length,
    sheetSafe_(data.accessibilityNeeds),
    'pendente',
    sheetSafe_(data.source),
  ];
}

function tooManyThisMinute_(cache) {
  const key = 'rate:' + Math.floor(Date.now() / 60000);
  const count = Number(cache.get(key) || 0) + 1;
  cache.put(key, String(count), 120);
  return count > MAX_PER_MINUTE;
}

function registrationsClosed_() {
  const flag = PropertiesService.getScriptProperties().getProperty('INSCRICOES_FECHADAS');
  return String(flag || '').toLowerCase() === 'sim';
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

function digest_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// HackaRun 2026: Web App que grava as inscrições do site na planilha e publica as equipes confirmadas.
// Cole no editor do Apps Script da planilha (Extensões > Apps Script) junto com Validation.gs, Limits.gs e Images.gs.

const SHEET_NAME = 'Inscricoes';
// prettier-ignore
const HEADERS = [
  'Protocolo', 'Data/hora', 'Modalidade', 'Equipe', 'Lider', 'E-mail', 'WhatsApp',
  'Curso', 'Periodo', 'Integrantes', 'Qtde', 'Acessibilidade', 'Status', 'Origem', 'Consentimento',
  'Chave de envio', 'Imagem',
];
// posição (base 0) de cada coluna no array de HEADERS
const COL = { protocol: 0, mode: 2, team: 3, email: 5, course: 7, size: 10, status: 12, key: 15, image: 16 };
const STATUS_OPTIONS = ['pendente', 'confirmado', 'recusado'];
const TEAMS_CACHE_KEY = 'teams:v2';
const TEAMS_CACHE_SECONDS = 60;
// Propriedade do script com o segredo dos ids públicos das equipes (idSecret_)
const ID_SECRET_PROPERTY = 'ID_SEGREDO';

function doPost(e) {
  const body = parseBody_(e);
  // primeiro filtro, barato: honeypot preenchido ou formulário enviado rápido demais
  if (!body || isBot_(body)) return json_({ ok: false, error: 'invalid' });
  const config = readConfig_();
  if (closedByConfig_(config, Date.now())) return json_({ ok: false, error: 'closed' });
  const data = validateRegistration_(body);
  if (!data) return json_({ ok: false, error: 'invalid' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return json_({ ok: false, error: 'rate-limited' });
  }
  let result;
  try {
    result = registerLocked_(data, body, config);
  } catch (err) {
    console.error(err);
    result = { output: json_({ ok: false, error: 'server' }), photo: null, protocol: '' };
  } finally {
    lock.releaseLock();
  }
  // compartilhar a foto é mais uma ida ao Drive: fica fora do lock pra fila de inscrições andar
  if (result.photo) shareImage_(result.photo, result.protocol);
  return result.output;
}

// a parte que precisa do lock: checagens de reenvio/repetido/capacidade, upload da foto e a linha nova.
// Devolve a resposta e a foto recém-criada (o compartilhamento dela é do doPost, já sem o lock)
function registerLocked_(data, body, config) {
  const done = (output) => ({ output: output, photo: null, protocol: '' });
  const cache = CacheService.getScriptCache();
  // retry do mesmo envio recebe o mesmo protocolo (caminho rápido, sem ler a planilha)
  const retryKey = 'sub:' + digest_(submissionId_(data, body));
  const previous = cache.get(retryKey);
  if (previous) return done(json_({ ok: true, protocol: previous }));
  if (rateLimited_(cache, digest_(data.leader.email), Date.now())) {
    return done(json_({ ok: false, error: 'rate-limited' }));
  }

  const sheet = getSheet_();
  const rows = readRows_(sheet);
  const existing = leaderRow_(rows, data.leader.email);
  if (existing) {
    // a resposta do primeiro envio se perdeu e o cache já foi: a chave gravada na linha reconhece o envio
    if (!data.idempotencyKey || String(existing[COL.key]) !== data.idempotencyKey) {
      return done(json_({ ok: false, error: 'duplicate' }));
    }
    return done(accepted_(cache, retryKey, String(existing[COL.protocol])));
  }
  if (capacityReached_(config, rows)) return done(json_({ ok: false, error: 'closed' }));
  const protocol = newProtocol_(rows);
  // a foto só sobe depois das checagens de reenvio e de repetido: retry nunca cria um segundo arquivo
  const photo = saveTeamImage_(protocol, data.image);
  const imageId = photo ? photo.getId() : '';
  try {
    ensureHeaders_(sheet);
    sheet.appendRow(toRow_(protocol, data, imageId));
  } catch (err) {
    discardImage_(imageId);
    throw err;
  }
  return { output: accepted_(cache, retryKey, protocol), photo: photo, protocol: protocol };
}

function doGet(e) {
  const action = e && e.parameter ? e.parameter.action : '';
  // open = prazo e propriedades ok (não lê a planilha); serve pra conferir a configuração
  if (action === 'health') return json_({ ok: true, open: !closedByConfig_(readConfig_(), Date.now()) });
  if (action === 'teams') return json_({ ok: true, teams: confirmedTeams_() });
  return json_({ ok: false, error: 'unknown-action' });
}

// gatilho simples: mudou a coluna Status ou a Imagem, a lista pública atualiza na hora (sem esperar o cache)
function onEdit(e) {
  try {
    const range = e && e.range;
    if (!range || range.getSheet().getName() !== SHEET_NAME) return;
    const touches = (col) => range.getColumn() <= col + 1 && range.getLastColumn() >= col + 1;
    if (touches(COL.status) || touches(COL.image)) {
      CacheService.getScriptCache().remove(TEAMS_CACHE_KEY);
    }
  } catch (err) {
    // gatilho simples não pode quebrar a edição da planilha
  }
}

// só o que é público: id derivado do protocolo, nome da equipe, curso, quantidade e o id da foto no Drive
function confirmedTeams_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(TEAMS_CACHE_KEY);
  if (hit) return JSON.parse(hit);
  const teams = readRows_(getSheet_())
    .filter((r) => isConfirmed_(r[COL.status]) && String(r[COL.team]).trim())
    .map((r) => ({
      id: publicTeamId_(String(r[COL.protocol])),
      name: String(r[COL.team]).trim().slice(0, 40),
      course: String(r[COL.course]).trim().slice(0, 80) || null,
      memberCount: Number(r[COL.size]) || 1,
      imageId: publicImageId_(r[COL.image]),
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

// uma leitura só por envio: e-mail repetido, protocolo e capacidade saem do mesmo array
function readRows_(sheet) {
  const last = sheet.getLastRow();
  return last > 1 ? sheet.getRange(2, 1, last - 1, HEADERS.length).getValues() : [];
}

// mesmo envio = mesma chave do formulário + mesmo e-mail; site antigo sem chave: e-mail + horário do cliente
function submissionId_(data, body) {
  if (data.idempotencyKey) return 'key|' + data.idempotencyKey + '|' + data.leader.email;
  return data.leader.email + '|' + String(body.submittedAt || '');
}

function accepted_(cache, retryKey, protocol) {
  cache.put(retryKey, protocol, 600);
  return json_({ ok: true, protocol: protocol });
}

function leaderRow_(rows, email) {
  return rows.find((r) => String(r[COL.email]).trim().toLowerCase() === email) || null;
}

// planilha criada antes de uma coluna nova: completa os títulos que faltam na primeira gravação
// (título que a organização renomeou fica como está)
function ensureHeaders_(sheet) {
  const range = sheet.getRange(1, 1, 1, HEADERS.length);
  const current = range.getValues()[0];
  const missing = (value) => value === '' || value == null;
  if (!current.some(missing)) return;
  range.setValues([HEADERS.map((title, i) => (missing(current[i]) ? title : current[i]))]);
}

// sem 0/O/1/I pra ninguém confundir ao ditar
function newProtocol_(rows) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const used = rows.map((r) => String(r[COL.protocol]));
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    const protocol = 'HR26-' + code;
    if (used.indexOf(protocol) === -1) return protocol;
  }
  throw new Error('Could not generate a unique protocol');
}

function toRow_(protocol, data, imageId) {
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
    sheetSafe_(data.consent),
    data.idempotencyKey,
    imageId || '',
  ];
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

// id público da equipe na lista do site. Só o hash do protocolo não bastava: dá pra testar os ~1 bilhão de
// protocolos possíveis e achar o de cada equipe. Com o segredo do script (fora do código) não tem como
function publicTeamId_(protocol) {
  return 'team-' + digest_(idSecret_() + '|' + protocol).slice(0, 10);
}

// criado sozinho na 1ª vez e guardado nas Propriedades do script; trocar ou apagar muda os ids públicos
function idSecret_() {
  const props = PropertiesService.getScriptProperties();
  const saved = String(props.getProperty(ID_SECRET_PROPERTY) || '');
  if (saved) return saved;
  const secret = Utilities.getUuid() + Utilities.getUuid();
  props.setProperty(ID_SECRET_PROPERTY, secret);
  return secret;
}

function digest_(text) {
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, text, Utilities.Charset.UTF_8);
  return bytes.map((b) => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// HackaRun 2026: Web App que grava as inscrições do site na planilha e publica as equipes confirmadas.
// Cole no editor do Apps Script da planilha (Extensões > Apps Script) junto com os outros .gs desta pasta
// (passo a passo no README.md).

const TEAMS_CACHE_KEY = 'teams:v3';
const TEAMS_CACHE_SECONDS = 60;
// Propriedade do script com o segredo dos ids públicos das equipes (idSecret_)
const ID_SECRET_PROPERTY = 'ID_SEGREDO';
// colunas que aparecem no site: mexeu numa delas, a lista pública atualiza na hora
const PUBLIC_COLUMNS = ['team', 'size', 'photo', 'status', 'link', 'imageId'];

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

// a parte que precisa do lock: reenvio, limite, duplicados, capacidade, upload da foto e as linhas novas.
// Devolve a resposta e a foto recém-criada (o compartilhamento dela é do doPost, já sem o lock)
function registerLocked_(data, body, config) {
  const done = (output) => ({ output: output, photo: null, protocol: '' });
  const cache = CacheService.getScriptCache();
  // retry do mesmo envio recebe o mesmo protocolo (caminho rápido, sem ler a planilha)
  const retryKey = 'sub:' + digest_(submissionId_(data, body));
  const previous = cache.get(retryKey);
  if (previous) return done(json_({ ok: true, protocol: previous }));
  if (rateLimited_(cache, digest_(data.members[0].email), Date.now())) {
    return done(json_({ ok: false, error: 'rate-limited' }));
  }

  const tabs = workbook_(config);
  const registry = loadRegistry_(tabs);
  // a resposta do primeiro envio se perdeu e o cache já foi: a chave gravada na linha reconhece o envio
  const saved = savedProtocol_(registry, data);
  if (saved) return done(accepted_(cache, retryKey, saved));
  const conflict = findConflict_(registry, data);
  if (conflict) return done(json_(conflict));
  if (capacityReached_(config, registry.teams)) return done(json_({ ok: false, error: 'closed' }));
  const protocol = newProtocol_(registry.teams);
  // a foto só sobe depois das checagens de reenvio e de duplicado: retry nunca cria um segundo arquivo
  const photo = saveTeamImage_(protocol, data.image);
  const imageId = photo ? photo.getId() : '';
  try {
    writeRegistration_(tabs, protocol, data, imageId);
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

// gatilho simples: mudou o Status, a foto ou o nome, a lista pública atualiza na hora (sem esperar o cache)
function onEdit(e) {
  try {
    const range = e && e.range;
    if (!range || range.getSheet().getName() !== TEAMS_SHEET) return;
    const touches = (col) => range.getColumn() <= col + 1 && range.getLastColumn() >= col + 1;
    if (PUBLIC_COLUMNS.some((key) => touches(COL[key]))) {
      CacheService.getScriptCache().remove(TEAMS_CACHE_KEY);
    }
  } catch (err) {
    // gatilho simples não pode quebrar a edição da planilha
  }
}

// só o que é público: id derivado do protocolo, nome da equipe, quantidade de integrantes e o id da foto
function confirmedTeams_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(TEAMS_CACHE_KEY);
  if (hit) return JSON.parse(hit);
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(TEAMS_SHEET);
  const rows = sheet ? readRows_(sheet, TEAM_HEADERS.length) : [];
  // uma leitura das Propriedades por chamada (e não uma por equipe): a cota diária é contada por leitura
  const secret = idSecret_();
  const teams = rows
    .filter((r) => isConfirmed_(r[COL.status]) && String(r[COL.team]).trim())
    .map((r) => ({
      id: publicTeamId_(String(r[COL.protocol]), secret),
      name: cellText_(r[COL.team]).trim().slice(0, 40),
      memberCount: Math.max(1, Math.round(Number(r[COL.size]) || 1)),
      imageId: publicImageId_(r[COL.imageId]),
    }));
  cache.put(TEAMS_CACHE_KEY, JSON.stringify(teams), TEAMS_CACHE_SECONDS);
  return teams;
}

// mesmo envio = mesma chave do formulário + mesmo contato; site antigo sem chave: contato + horário do cliente
function submissionId_(data, body) {
  const contact = data.members[0].email;
  if (data.idempotencyKey) return 'key|' + data.idempotencyKey + '|' + contact;
  return contact + '|' + String(body.submittedAt || '');
}

function accepted_(cache, retryKey, protocol) {
  cache.put(retryKey, protocol, 600);
  return json_({ ok: true, protocol: protocol });
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

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(ContentService.MimeType.JSON);
}

// id público da equipe na lista do site. Só o hash do protocolo não bastava: dá pra testar os ~1 bilhão de
// protocolos possíveis e achar o de cada equipe. Com o segredo do script (fora do código) não tem como
function publicTeamId_(protocol, secret) {
  return 'team-' + digest_(secret + '|' + protocol).slice(0, 10);
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

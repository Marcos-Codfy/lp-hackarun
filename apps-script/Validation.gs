// validação do lado do servidor: nunca confie só no front (qualquer um pode chamar a URL)

// mantenha igual ao registration.teamSize do src/infrastructure/content/event.json (um teste confere)
const TEAM_SIZE = { min: 2, max: 5 };
// mantenha igual ao MIN_FILL_MS do src/application/use-cases/SubmitRegistration.ts (um teste confere)
const MIN_ELAPSED_MS = 3000;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CONSENT_VERSION_PATTERN = /^[A-Za-z0-9][\w.-]{0,31}$/;
// UUID do navegador; sem hífen na frente (vai pra planilha) e com teto de tamanho
const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{7,63}$/;

function parseBody_(e) {
  try {
    const raw = e && e.postData ? e.postData.contents : '';
    const body = JSON.parse(raw);
    return body && typeof body === 'object' && !Array.isArray(body) ? body : null;
  } catch (err) {
    return null;
  }
}

// filtro de robô bobo; os dois campos vêm do cliente, então o limite de envios (Limits.gs) segue valendo
function isBot_(body) {
  return String(body.honeypot || '').trim() !== '' || !(Number(body.elapsedMs) >= MIN_ELAPSED_MS);
}

// devolve os dados limpos ou null se qualquer regra falhar
function validateRegistration_(body) {
  const mode = body.mode === 'solo' ? 'solo' : body.mode === 'team' ? 'team' : null;
  const leaderRaw = body.leader && typeof body.leader === 'object' ? body.leader : {};
  const leader = {
    name: clean_(leaderRaw.name, 80),
    email: clean_(leaderRaw.email, 120).toLowerCase(),
    phone: formatPhone_(leaderRaw.phone),
    course: clean_(leaderRaw.course, 80),
    semester: clean_(leaderRaw.semester, 40),
  };
  if (
    !mode ||
    !isPersonName_(leader.name) ||
    !EMAIL_PATTERN.test(leader.email) ||
    !leader.phone ||
    !leader.course
  ) {
    return null;
  }
  const team = mode === 'team' ? validateTeam_(body, leader.email) : { teamName: '', members: [] };
  const consent = parseConsent_(body);
  if (!team || !consent) return null;

  return {
    mode: mode,
    teamName: team.teamName,
    leader: leader,
    members: team.members,
    accessibilityNeeds: clean_(body.accessibilityNeeds, 500),
    source: clean_(body.source, 40) || 'landing-page',
    consent: consent,
    idempotencyKey: parseIdempotencyKey_(body.idempotencyKey),
  };
}

function validateTeam_(body, leaderEmail) {
  const teamName = clean_(body.teamName, 40);
  const rawMembers = Array.isArray(body.members) ? body.members.slice(0, TEAM_SIZE.max) : [];
  const members = rawMembers.map((m) => ({
    name: clean_(m && m.name, 80),
    email: clean_(m && m.email, 120).toLowerCase(),
    course: clean_(m && m.course, 80),
  }));
  const size = 1 + members.length;
  const validMembers = members.every((m) => isPersonName_(m.name) && EMAIL_PATTERN.test(m.email));
  const emails = [leaderEmail].concat(members.map((m) => m.email));
  const unique = emails.filter((v, i) => emails.indexOf(v) === i).length === emails.length;
  if (teamName.length < 2 || size < TEAM_SIZE.min || size > TEAM_SIZE.max || !validMembers || !unique)
    return null;
  return { teamName: teamName, members: members };
}

// prova do aceite (LGPD): versão do aviso de privacidade + quando; sem isso a inscrição não entra
function parseConsent_(body) {
  const version = clean_(body.consentVersion, 32);
  const at = Date.parse(clean_(body.consentAt, 40));
  if (!CONSENT_VERSION_PATTERN.test(version) || Number.isNaN(at)) return '';
  return version + ' · ' + new Date(at).toISOString();
}

// chave torta ou ausente (versão antiga do site) vira '': o envio cai na regra de e-mail + horário
function parseIdempotencyKey_(raw) {
  const key = String(raw == null ? '' : raw).trim();
  return IDEMPOTENCY_KEY_PATTERN.test(key) ? key : '';
}

function isPersonName_(name) {
  return name.length >= 5 && name.indexOf(' ') > 0;
}

// celular BR com DDD; salva no formato (63) 99999-9999
function formatPhone_(raw) {
  const digits = String(raw || '')
    .replace(/\D/g, '')
    .replace(/^55(?=\d{10,11}$)/, '');
  if (!/^[1-9]{2}9?\d{8}$/.test(digits)) return '';
  return digits.length === 11
    ? '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 7) + '-' + digits.slice(7)
    : '(' + digits.slice(0, 2) + ') ' + digits.slice(2, 6) + '-' + digits.slice(6);
}

function clean_(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .trim()
    .slice(0, max);
}

// texto começando com = + - @ vira fórmula na planilha (injeção): o apóstrofo força texto puro
function sheetSafe_(value) {
  const text = String(value == null ? '' : value);
  return /^[=+\-@]/.test(text) ? "'" + text : text;
}

function isConfirmed_(status) {
  return normalizeStatus_(status).indexOf('confirmad') === 0;
}

function isRejected_(status) {
  return normalizeStatus_(status).indexOf('recusad') === 0;
}

// "Confirmado", " confirmada " e "CONFIRMADO" valem igual
function normalizeStatus_(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

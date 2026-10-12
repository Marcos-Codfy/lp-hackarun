// validação do lado do servidor: nunca confie só no front (qualquer um pode chamar a URL).
// As regras espelham os value objects do site (src/domain/value-objects); um teste roda os dois lados

// mantenha igual ao registration.teamSize do src/infrastructure/content/event.json (um teste confere)
const TEAM_SIZE = { min: 2, max: 5 };
// mantenha igual ao MIN_FILL_MS do src/application/use-cases/SubmitRegistration.ts (um teste confere)
const MIN_ELAPSED_MS = 3000;
// mesmas regras do TeamName, FullName, StudentId e Email do domínio (um teste confere)
const TEAM_NAME_LIMITS = { min: 2, max: 40 };
const NAME_MAX = 80;
const NAME_FORBIDDEN = /[0-9@<>{}[\]\\/|=+_#$%^&*~;:!?"()]/;
const STUDENT_ID_LIMITS = { min: 4, max: 20 };
const STUDENT_ID_PATTERN = /^[A-Z0-9./-]+$/;
const EMAIL_MAX = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
// versão vigente do aviso de privacidade (/privacidade). Mantenha igual ao CONSENT_VERSION do
// src/application/use-cases/SubmitRegistration.ts (um teste confere): aceite de aviso antigo não vale
const CONSENT_VERSION = '2026-10-v3';
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

// devolve os dados limpos ou null se qualquer regra falhar. Só equipe: members[0] é o contato
function validateRegistration_(body) {
  const teamName = clean_(body.teamName, 200);
  if (teamName.length < TEAM_NAME_LIMITS.min || teamName.length > TEAM_NAME_LIMITS.max) return null;
  const raw = Array.isArray(body.members) ? body.members : [];
  if (raw.length < TEAM_SIZE.min || raw.length > TEAM_SIZE.max) return null;
  const members = raw.map(parseMember_);
  if (members.some((m) => !m) || !unique_(members, 'email') || !unique_(members, 'studentId')) return null;
  const consent = parseConsent_(body);
  // foto ou logo obrigatória (Images.gs confere tipo, tamanho e os bytes)
  const image = parseTeamImage_(body.teamImage);
  if (!consent || !image) return null;
  return {
    teamName: teamName,
    members: members,
    source: clean_(body.source, 40) || 'landing-page',
    consent: consent,
    idempotencyKey: parseIdempotencyKey_(body.idempotencyKey),
    image: image,
  };
}

function parseMember_(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const member = {
    name: clean_(raw.name, NAME_MAX + 1),
    studentId: normalizeStudentId_(raw.studentId),
    email: clean_(raw.email, EMAIL_MAX + 1).toLowerCase(),
  };
  if (!isFullName_(member.name) || !isStudentId_(member.studentId) || !isEmail_(member.email)) return null;
  return member;
}

// nome e sobrenome: pelo menos duas palavras de 2+ letras, sem número nem símbolo de código
function isFullName_(name) {
  if (!name || name.length > NAME_MAX || NAME_FORBIDDEN.test(name)) return false;
  return name.split(' ').filter((word) => word.replace(/[.'-]/g, '').length >= 2).length >= 2;
}

function normalizeStudentId_(raw) {
  return String(raw == null ? '' : raw)
    .trim()
    .toUpperCase();
}

function isStudentId_(id) {
  const fits = id.length >= STUDENT_ID_LIMITS.min && id.length <= STUDENT_ID_LIMITS.max;
  return fits && STUDENT_ID_PATTERN.test(id);
}

function isEmail_(email) {
  return email.length <= EMAIL_MAX && EMAIL_PATTERN.test(email);
}

function unique_(members, field) {
  const values = members.map((m) => m[field]);
  return values.every((value, i) => values.indexOf(value) === i);
}

// prova do aceite (LGPD): versão do aviso de privacidade + quando; sem isso a inscrição não entra
function parseConsent_(body) {
  const version = clean_(body.consentVersion, 32);
  const at = Date.parse(clean_(body.consentAt, 40));
  if (version !== CONSENT_VERSION || Number.isNaN(at)) return '';
  return version + ' · ' + new Date(at).toISOString();
}

// chave torta ou ausente (versão antiga do site) vira '': o envio cai na regra de contato + horário
function parseIdempotencyKey_(raw) {
  const key = String(raw == null ? '' : raw).trim();
  return IDEMPOTENCY_KEY_PATTERN.test(key) ? key : '';
}

function clean_(value, max) {
  return String(value == null ? '' : value)
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .replace(/\s+/g, ' ')
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

// validação do lado do servidor: nunca confie só no front (qualquer um pode chamar a URL).
// As regras espelham o domínio do site (ParticipantRegistration e os value objects); um teste roda os dois lados

// mantenha igual ao MIN_FILL_MS do src/application/use-cases/SubmitRegistration.ts (um teste confere)
const MIN_ELAPSED_MS = 3000;
// mesmas regras do FullName, StudentId, Email, Phone e ShortText do domínio (um teste confere)
const NAME_MAX = 80;
const NAME_FORBIDDEN = /[0-9@<>{}[\]\\/|=+_#$%^&*~;:!?"()]/;
const STUDENT_ID_LIMITS = { min: 4, max: 20 };
const STUDENT_ID_PATTERN = /^[A-Z0-9./-]+$/;
const EMAIL_MAX = 120;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE_DDD = /^[1-9][1-9]$/;
const SHORT_TEXT_FORBIDDEN = /[<>{}[\]\\|=^~`$]/;
// mesmos COURSE_RULE e INSTITUTION_RULE do src/domain/entities/ParticipantRegistration.ts
const COURSE_LIMITS = { min: 3, max: 80 };
const INSTITUTION_LIMITS = { min: 2, max: 100 };
// mesmos PARTICIPANT_PROFILES, TECH_AREAS e PERIOD_RANGE do src/domain/value-objects/ParticipantProfile.ts
const PROFILES = ['unicatolica', 'other-institution', 'graduate', 'self-taught'];
const AREAS = ['development', 'data-ai', 'design', 'infra', 'security', 'product', 'other'];
const PERIOD_RANGE = { min: 1, max: 10 };
const UNICATOLICA = 'UniCatólica';
// versão vigente do aviso de privacidade (/privacidade). Mantenha igual ao CONSENT_VERSION do
// src/application/use-cases/SubmitRegistration.ts (um teste confere): aceite de aviso antigo não vale
const CONSENT_VERSION = '2026-10-v5';
// versões do aviso que ainda valem: a vigente e a anterior. Quem abriu a página antes da troca ainda envia a v4,
// e recusar essa pessoa derrubaria a inscrição. Tire a v4 daqui só depois de dias com o site já na v5
const ACCEPTED_CONSENT_VERSIONS = [CONSENT_VERSION, '2026-10-v4'];
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

// devolve os dados limpos ou null se qualquer regra falhar. Uma pessoa por envio (as equipes saem do sorteio)
function validateRegistration_(body) {
  const raw = body.participant;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const participant = parseParticipant_(raw);
  const consent = parseConsent_(body);
  if (!participant || !consent) return null;
  return {
    participant: participant,
    source: clean_(body.source, 40) || 'landing-page',
    consent: consent,
    idempotencyKey: parseIdempotencyKey_(body.idempotencyKey),
  };
}

function parseParticipant_(raw) {
  const name = clean_(raw.name, NAME_MAX + 1);
  const email = clean_(raw.email, EMAIL_MAX + 1).toLowerCase();
  const phone = normalizePhone_(raw.whatsapp);
  const profile = PROFILES.indexOf(raw.profile) >= 0 ? raw.profile : '';
  if (!isFullName_(name) || !isEmail_(email) || !phone || !profile) return null;
  if (typeof raw.adult !== 'boolean') return null;
  const details = profileDetails_(profile, raw);
  if (!details) return null;
  return {
    name: name,
    email: email,
    whatsapp: phone.value,
    phoneDigits: phone.digits,
    profile: profile,
    institution: details.institution,
    course: details.course,
    period: details.period,
    studentId: details.studentId,
    area: details.area,
    adult: raw.adult,
  };
}

// campos que dependem do perfil (igual ao ParticipantRegistration.details): o que não vale pro perfil é
// ignorado e sai vazio (a pessoa pode ter trocado de opção no formulário)
function profileDetails_(profile, raw) {
  const out = { institution: '', course: '', period: 0, studentId: '', area: '' };
  if (profile !== 'self-taught') {
    out.course = cleanText_(raw.course, COURSE_LIMITS);
    if (!out.course) return null;
  }
  if (isStudying_(profile)) {
    out.period = parsePeriod_(raw.period);
    if (!out.period) return null;
  }
  if (profile === 'other-institution' && clean_(raw.institution, 1)) {
    out.institution = cleanText_(raw.institution, INSTITUTION_LIMITS);
    if (!out.institution) return null;
  }
  if (profile === 'unicatolica') {
    out.institution = UNICATOLICA;
    const studentId = normalizeStudentId_(raw.studentId);
    if (studentId && !isStudentId_(studentId)) return null;
    out.studentId = studentId;
  }
  if (needsArea_(profile)) {
    if (AREAS.indexOf(raw.area) === -1) return null;
    out.area = raw.area;
  }
  return out;
}

function isStudying_(profile) {
  return profile === 'unicatolica' || profile === 'other-institution';
}

function needsArea_(profile) {
  return profile === 'graduate' || profile === 'self-taught';
}

// inteiro de 1 a 10; 0 = inválido (Number('') é 0, então campo vazio também cai fora)
function parsePeriod_(raw) {
  const period = Number(String(raw == null ? '' : raw).trim());
  return Number.isInteger(period) && period >= PERIOD_RANGE.min && period <= PERIOD_RANGE.max ? period : 0;
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

// mesmo Phone.digitsOf: só os dígitos, sem o 0 da frente ("063...") e sem o 55 do país
function phoneDigits_(raw) {
  const digits = String(raw == null ? '' : raw)
    .replace(/\D/g, '')
    .replace(/^0+/, '');
  const withCountry = (digits.length === 12 || digits.length === 13) && digits.indexOf('55') === 0;
  return withCountry ? digits.slice(2) : digits;
}

// { value: "(63) 99999-9999", digits } ou null. Celular: 9 dígitos começando com 9; fixo: 8, de 2 a 5
function normalizePhone_(raw) {
  if (!String(raw == null ? '' : raw).trim()) return null;
  const digits = phoneDigits_(raw);
  const ddd = digits.slice(0, 2);
  const number = digits.slice(2);
  const mobile = number.length === 9 && number.charAt(0) === '9';
  const landline = number.length === 8 && /^[2-5]/.test(number);
  if (!PHONE_DDD.test(ddd) || !(mobile || landline)) return null;
  return { value: '(' + ddd + ') ' + number.slice(0, -4) + '-' + number.slice(-4), digits: digits };
}

// texto curto (curso, instituição), igual ao ShortText: espaço sobrando sai, símbolo de código é recusado
function cleanText_(raw, limits) {
  const value = clean_(raw, limits.max + 1);
  if (value.length < limits.min || value.length > limits.max) return '';
  return SHORT_TEXT_FORBIDDEN.test(value) ? '' : value;
}

// prova do aceite (LGPD): versão do aviso de privacidade + quando; sem isso a inscrição não entra
function parseConsent_(body) {
  const version = clean_(body.consentVersion, 32);
  const at = Date.parse(clean_(body.consentAt, 40));
  if (ACCEPTED_CONSENT_VERSIONS.indexOf(version) === -1 || Number.isNaN(at)) return '';
  return version + ' · ' + new Date(at).toISOString();
}

// chave torta ou ausente (versão antiga do site) vira '': o envio cai na regra de e-mail + horário
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

// cancelado libera a vaga, o e-mail, o WhatsApp e a matrícula
function isCancelled_(status) {
  return normalizeStatus_(status).indexOf('cancelad') === 0;
}

// "Confirmado", " confirmada " e "CONFIRMADO" valem igual
function normalizeStatus_(status) {
  return String(status || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

// quem já está inscrito: e-mails, WhatsApps e matrículas das inscrições que não foram canceladas.
// Cada pessoa se inscreve uma vez só; Status cancelado libera a vaga, o e-mail, o WhatsApp e a matrícula

// comparação sem acento, sem caixa e sem espaço sobrando ("Equipe  Pikachu" = "equipe pikachu")
function nameKey_(value) {
  return cellText_(value).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
}

function emailKey_(value) {
  return cellText_(value).trim().toLowerCase();
}

// "(63) 99999-9999", "63999999999" e "+55 63 99999-9999" são o mesmo número
function phoneKey_(value) {
  return phoneDigits_(cellText_(value));
}

function studentIdKey_(value) {
  return cellText_(value).trim().toUpperCase();
}

// o apóstrofo do sheetSafe_ não faz parte do valor
function cellText_(value) {
  return String(value == null ? '' : value).replace(/^'/, '');
}

function loadRegistry_(sheet) {
  const rows = readRows_(sheet, REGISTRATION_HEADERS.length).filter((r) => String(r[RCOL.protocol]).trim());
  const emails = new Set();
  const phones = new Set();
  const studentIds = new Set();
  let active = 0;
  rows.forEach((r) => {
    if (isCancelled_(r[RCOL.status])) return;
    active++;
    // célula apagada à mão não segura nada
    [
      [emails, emailKey_(r[RCOL.email])],
      [phones, phoneKey_(r[RCOL.whatsapp])],
      [studentIds, studentIdKey_(r[RCOL.studentId])],
    ].forEach((pair) => {
      if (pair[1]) pair[0].add(pair[1]);
    });
  });
  return { rows: rows, active: active, emails: emails, phones: phones, studentIds: studentIds };
}

// a resposta perdida do 1º envio: mesma chave do formulário + mesmo e-mail = o protocolo já gravado
function savedProtocol_(registry, data) {
  if (!data.idempotencyKey) return '';
  const email = data.participant.email;
  const row = registry.rows.find(
    (r) => String(r[RCOL.key]) === data.idempotencyKey && emailKey_(r[RCOL.email]) === email,
  );
  return row ? String(row[RCOL.protocol]) : '';
}

// null ou a resposta de erro; o site aponta o campo pelo código
function findConflict_(registry, data) {
  const p = data.participant;
  if (registry.emails.has(p.email)) return { ok: false, error: 'duplicate_email' };
  if (registry.phones.has(p.phoneDigits)) return { ok: false, error: 'duplicate_whatsapp' };
  if (p.studentId && registry.studentIds.has(p.studentId)) {
    return { ok: false, error: 'duplicate_student_id' };
  }
  return null;
}

// quem já está inscrito: nome de equipe, e-mails e matrículas das equipes que não foram recusadas.
// Cada pessoa participa de uma equipe só; recusar uma equipe libera o nome, os e-mails e as matrículas

// comparação sem acento, sem caixa e sem espaço sobrando ("Bug  Busters" = "bug busters" = "Bug Bústers")
function nameKey_(value) {
  return cellText_(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function emailKey_(value) {
  return cellText_(value).trim().toLowerCase();
}

function studentIdKey_(value) {
  return cellText_(value).trim().toUpperCase();
}

// o apóstrofo do sheetSafe_ não faz parte do valor
function cellText_(value) {
  return String(value == null ? '' : value).replace(/^'/, '');
}

function loadRegistry_(tabs) {
  const teams = readRows_(tabs.teams, TEAM_HEADERS.length).filter((r) => String(r[COL.protocol]).trim());
  const active = new Set();
  const names = new Set();
  teams.forEach((r) => {
    if (isRejected_(r[COL.status])) return;
    active.add(String(r[COL.protocol]).trim());
    names.add(nameKey_(r[COL.team]));
  });
  const emails = new Set();
  const studentIds = new Set();
  readRows_(tabs.members, MEMBER_HEADERS.length).forEach((r) => {
    // integrante de equipe recusada (ou de uma linha de equipe apagada) não segura mais nada
    if (!active.has(String(r[MCOL.protocol]).trim())) return;
    emails.add(emailKey_(r[MCOL.email]));
    studentIds.add(studentIdKey_(r[MCOL.studentId]));
  });
  return { teams: teams, names: names, emails: emails, studentIds: studentIds };
}

// a resposta perdida do 1º envio: mesma chave do formulário + mesmo contato = o protocolo já gravado
function savedProtocol_(registry, data) {
  if (!data.idempotencyKey) return '';
  const contact = data.members[0].email;
  const row = registry.teams.find(
    (r) => String(r[COL.key]) === data.idempotencyKey && emailKey_(r[COL.contact]) === contact,
  );
  return row ? String(row[COL.protocol]) : '';
}

// null ou a resposta de erro, com a posição de cada integrante já inscrito (o site aponta o campo)
function findConflict_(registry, data) {
  if (registry.names.has(nameKey_(data.teamName))) {
    return { ok: false, error: 'duplicate_team_name', members: [] };
  }
  const taken = (set, key) => data.members.map((m, i) => (set.has(key(m)) ? i : -1)).filter((i) => i >= 0);
  const emails = taken(registry.emails, (m) => m.email);
  if (emails.length) return { ok: false, error: 'duplicate_email', members: emails };
  const studentIds = taken(registry.studentIds, (m) => m.studentId);
  if (studentIds.length) return { ok: false, error: 'duplicate_student_id', members: studentIds };
  return null;
}

// cadastro de mentores (egressos e profissionais que ajudam as equipes no evento): ação "register-mentor" do
// doPost, aba "Mentores" (uma linha por pessoa) e aba "Resumo Mentores". É independente das inscrições: não mexe
// nas abas Inscritos, Equipes e Resumo, nem na SETUP_VERSION delas, e o que muda em outros arquivos é uma linha do
// Code.gs (o desvio no doPost). Cole este arquivo no editor do Apps Script junto com os outros .gs desta pasta.

const MENTORS_SHEET = 'Mentores';
const MENTORS_SUMMARY_SHEET = 'Resumo Mentores';
// subiu o layout da aba Mentores? suba a versão: o próximo cadastro refaz a formatação dela (só dela)
const MENTOR_SETUP_VERSION = '1';
const MENTOR_SETUP_PROPERTY = 'MENTORES_VERSAO';
// propriedade do script: MENTORES_FECHADOS=sim fecha o cadastro de mentores na hora (as inscrições seguem como estão)
const MENTORS_CLOSED_PROPERTY = 'MENTORES_FECHADOS';
// versão do aviso de privacidade dos mentores (/privacidade, seção "Mentores"). Mantenha igual ao
// MENTOR_CONSENT_VERSION do src/application/use-cases/SubmitMentorRegistration.ts (um teste confere)
const MENTOR_CONSENT_VERSION = '2026-10-m1';
const MENTOR_ACCEPTED_CONSENT_VERSIONS = [MENTOR_CONSENT_VERSION];
const MENTOR_SUMMARY_PROTECTION = 'HackaRun · resumo dos mentores (fórmulas automáticas)';
const MENTOR_SUMMARY_FIRST_ROW = 5;

// as listas abaixo são o contrato com o formulário (src/domain/value-objects/MentorProfile.ts; um teste confere)
const MENTOR_AREAS = [
  'development',
  'data-ai',
  'infra',
  'security',
  'tech-lead',
  'design',
  'product',
  'quality',
  'other',
];
const MENTOR_DAYS = ['11', '12', '13', '14'];
const GRADUATION_YEARS = { min: 1995, max: 2030 };
// mesmos MENTOR_*_RULE do src/domain/entities/MentorRegistration.ts e PROFILE_LINK do ProfileLink.ts (um teste confere)
const MENTOR_AREA_OTHER_LIMITS = { min: 2, max: 60 };
const MENTOR_SPECIALTIES_LIMITS = { min: 2, max: 120 };
const MENTOR_COURSE_LIMITS = { min: 3, max: 80 };
const PROFILE_LINK_MAX = 200;
const PROFILE_LINK_PATTERN = /^https:\/\/[A-Za-z0-9][A-Za-z0-9.-]*\.[A-Za-z]{2,}(?:[/?#][^\s<>"'`\\]*)?$/;

// rótulos em pt-BR do que o site manda em código
const MENTOR_AREA_LABELS = {
  development: 'Desenvolvimento',
  'data-ai': 'Dados e IA',
  infra: 'Redes e infraestrutura',
  security: 'Cibersegurança',
  'tech-lead': 'Liderança técnica (tech lead)',
  design: 'Design e UX',
  product: 'Produto e gestão',
  quality: 'Qualidade e testes',
  other: 'Outra',
};
const MENTOR_DAY_LABELS = {
  11: '11/11 (qua)',
  12: '12/11 (qui)',
  13: '13/11 (sex)',
  14: '14/11 (sáb)',
};
const MENTOR_STATUS_OPTIONS = ['novo', 'contatado', 'confirmado', 'recusado', 'cancelado'];
// [fundo, texto]: as mesmas cores do CHOICE_STYLES do Setup.gs (que não tem estes três status)
const MENTOR_CHOICE_STYLES = {
  novo: ['#E3ECFF', '#1A3A8A'],
  contatado: ['#FFF1CC', '#6B4400'],
  recusado: ['#FDE1E8', '#8A1530'],
};
const MENTOR_TAB_COLOR = '#FFC24A';

// key = nome no código; title = título na planilha; format '@' = texto puro
// prettier-ignore
const MENTOR_COLUMNS = [
  { key: 'protocol', title: 'Protocolo', width: 120 },
  { key: 'date', title: 'Data/hora', width: 130, format: 'dd/MM/yyyy HH:mm' },
  { key: 'name', title: 'Nome completo', width: 230, format: '@', wrap: true },
  { key: 'email', title: 'E-mail', width: 240, format: '@' },
  { key: 'whatsapp', title: 'WhatsApp', width: 140, format: '@' },
  { key: 'chat', title: 'Conversar', width: 130, align: 'center' },
  { key: 'area', title: 'Área de atuação', width: 200, wrap: true },
  { key: 'areaOther', title: 'Qual área (outra)', width: 200, format: '@', wrap: true },
  { key: 'specialties', title: 'Especialidades', width: 220, format: '@', wrap: true },
  { key: 'graduate', title: 'Egresso da UniCatólica', width: 110, align: 'center', wrap: true },
  { key: 'course', title: 'Curso', width: 200, format: '@', wrap: true },
  { key: 'gradYear', title: 'Ano de formatura', width: 100, format: '@', align: 'center' },
  { key: 'linkedin', title: 'LinkedIn ou site', width: 240, format: '@' },
  { key: 'days', title: 'Dias disponíveis', width: 200, wrap: true },
  { key: 'publish', title: 'Pode divulgar no site', width: 110, align: 'center', wrap: true },
  { key: 'status', title: 'Status', width: 120, align: 'center' },
  { key: 'team', title: 'Equipe(s) atendida(s)', width: 200, wrap: true },
  { key: 'orgNotes', title: 'Anotações da organização', width: 260, wrap: true },
  { key: 'source', title: 'Origem', width: 110 },
  { key: 'consent', title: 'Consentimento', width: 240 },
  { key: 'key', title: 'Chave de envio', width: 200, format: '@' },
];
const MENTOR_HEADERS = MENTOR_COLUMNS.map((c) => c.title);
// posição (base 0) de cada coluna: MCOL.status, MCOL.email... (função própria: não depende da ordem de carga dos arquivos)
const MCOL = mentorColumnIndex_(MENTOR_COLUMNS);

function mentorColumnIndex_(columns) {
  const index = {};
  columns.forEach((column, i) => (index[column.key] = i));
  return index;
}

// ---------------------------------------------------------------------------------------------------------------
// envio do formulário (doPost -> body.action === 'register-mentor')

function registerMentor_(body) {
  if (mentorsClosed_()) return json_({ ok: false, error: 'closed' });
  const data = validateMentor_(body);
  if (!data) return json_({ ok: false, error: 'invalid' });

  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (err) {
    return json_({ ok: false, error: 'rate-limited' });
  }
  try {
    const output = registerMentorLocked_(data);
    // grava a linha antes de soltar o lock: o próximo da fila já enxerga esta pessoa (duplicados)
    SpreadsheetApp.flush();
    return output;
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'server' });
  } finally {
    lock.releaseLock();
  }
}

function mentorsClosed_() {
  const value = PropertiesService.getScriptProperties().getProperty(MENTORS_CLOSED_PROPERTY);
  return (
    String(value || '')
      .trim()
      .toLowerCase() === 'sim'
  );
}

// a parte que precisa do lock: reenvio, limite, duplicados e a linha nova
function registerMentorLocked_(data) {
  const cache = CacheService.getScriptCache();
  // retry do mesmo envio recebe o mesmo protocolo (caminho rápido, sem ler a planilha)
  const retryKey = 'msub:' + digest_(mentorSubmissionId_(data));
  const previous = cache.get(retryKey);
  if (previous) return json_({ ok: true, protocol: previous });
  if (rateLimited_(cache, digest_(data.mentor.email), Date.now())) {
    return json_({ ok: false, error: 'rate-limited' });
  }

  const sheet = mentorsSheet_();
  const registry = loadMentorRegistry_(sheet);
  // a resposta do primeiro envio se perdeu e o cache já foi: a chave gravada na linha reconhece o envio
  const saved = savedMentorProtocol_(registry, data);
  if (saved) return accepted_(cache, retryKey, saved);
  const conflict = findMentorConflict_(registry, data);
  if (conflict) return json_(conflict);
  const protocol = newMentorProtocol_(registry.rows);
  appendMentor_(sheet, protocol, data);
  return accepted_(cache, retryKey, protocol);
}

// mesmo envio = mesma chave do formulário + mesmo e-mail
function mentorSubmissionId_(data) {
  const email = data.mentor.email;
  return data.idempotencyKey ? 'key|' + data.idempotencyKey + '|' + email : email + '|' + data.consent;
}

// sem 0/O/1/I pra ninguém confundir ao ditar
function newMentorProtocol_(rows) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const used = rows.map((r) => String(r[MCOL.protocol]));
  for (let attempt = 0; attempt < 10; attempt++) {
    let code = '';
    for (let i = 0; i < 6; i++) code += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    const protocol = 'MT26-' + code;
    if (used.indexOf(protocol) === -1) return protocol;
  }
  throw new Error('Could not generate a unique mentor protocol');
}

// ---------------------------------------------------------------------------------------------------------------
// validação (as mesmas regras do MentorRegistration do site; o que falhar devolve null)

function validateMentor_(body) {
  const raw = body.mentor;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const mentor = parseMentor_(raw);
  const consent = parseMentorConsent_(body);
  if (!mentor || !consent) return null;
  return {
    mentor: mentor,
    source: clean_(body.source, 40) || 'mentor-page',
    consent: consent,
    idempotencyKey: parseIdempotencyKey_(body.idempotencyKey),
  };
}

function parseMentor_(raw) {
  const name = clean_(raw.name, NAME_MAX + 1);
  const email = clean_(raw.email, EMAIL_MAX + 1).toLowerCase();
  const phone = normalizePhone_(raw.whatsapp);
  if (!isFullName_(name) || !isEmail_(email) || !phone) return null;
  if (MENTOR_AREAS.indexOf(raw.area) === -1) return null;
  if (typeof raw.graduate !== 'boolean' || typeof raw.mayPublish !== 'boolean') return null;
  // "outra": a pessoa escreve qual é a área; nas demais, o que sobrou no campo escondido não conta
  const areaOther = raw.area === 'other' ? cleanText_(raw.areaOther, MENTOR_AREA_OTHER_LIMITS) : '';
  const specialties = optionalText_(raw.specialties, MENTOR_SPECIALTIES_LIMITS);
  const linkedin = parseProfileLink_(raw.linkedin);
  if ((raw.area === 'other' && !areaOther) || specialties === null || linkedin === null) return null;
  let course = '';
  let graduationYear = 0;
  if (raw.graduate) {
    course = cleanText_(raw.course, MENTOR_COURSE_LIMITS);
    graduationYear = parseGraduationYear_(raw.graduationYear);
    if (!course || !graduationYear) return null;
  }
  const days = parseMentorDays_(raw.days);
  if (days.length === 0) return null;
  return {
    name: name,
    email: email,
    whatsapp: phone.value,
    phoneDigits: phone.digits,
    area: raw.area,
    areaOther: areaOther,
    specialties: specialties,
    linkedin: linkedin,
    graduate: raw.graduate,
    course: course,
    graduationYear: graduationYear,
    days: days,
    mayPublish: raw.mayPublish,
  };
}

// campo opcional: vazio = '' e preenchido passa pela regra; null = preenchido e inválido
function optionalText_(raw, limits) {
  if (!clean_(raw, 1)) return '';
  return cleanText_(raw, limits) || null;
}

// mesmo ProfileLink.normalize/create: "linkedin.com/in/ana" vira https://...; vazio = '' (opcional); null = inválido
function parseProfileLink_(raw) {
  const text = String(raw == null ? '' : raw).trim();
  if (!text) return '';
  const value = /^https:\/\//i.test(text) ? text : 'https://' + text.replace(/^http:\/\//i, '');
  return value.length <= PROFILE_LINK_MAX && PROFILE_LINK_PATTERN.test(value) ? value : null;
}

// inteiro dentro do intervalo; 0 = inválido (campo vazio também cai fora)
function parseGraduationYear_(raw) {
  const year = Number(String(raw == null ? '' : raw).trim());
  return Number.isInteger(year) && year >= GRADUATION_YEARS.min && year <= GRADUATION_YEARS.max ? year : 0;
}

// dias na ordem do evento, sem repetir e sem opção que não existe
function parseMentorDays_(raw) {
  const chosen = Array.isArray(raw) ? raw.map((day) => String(day)) : [];
  return MENTOR_DAYS.filter((day) => chosen.indexOf(day) >= 0);
}

// prova do aceite (LGPD): versão do aviso dos mentores + quando; sem isso o cadastro não entra
function parseMentorConsent_(body) {
  const version = clean_(body.consentVersion, 32);
  const at = Date.parse(clean_(body.consentAt, 40));
  if (MENTOR_ACCEPTED_CONSENT_VERSIONS.indexOf(version) === -1 || Number.isNaN(at)) return '';
  return version + ' · ' + new Date(at).toISOString();
}

// ---------------------------------------------------------------------------------------------------------------
// quem já está cadastrado (e-mails e WhatsApps dos cadastros que não foram cancelados) e a gravação da linha

function loadMentorRegistry_(sheet) {
  const rows = readRows_(sheet, MENTOR_COLUMNS.length).filter((r) => String(r[MCOL.protocol]).trim());
  const emails = new Set();
  const phones = new Set();
  let active = 0;
  rows.forEach((r) => {
    if (isCancelled_(r[MCOL.status])) return;
    active++;
    // célula apagada à mão não segura nada
    [
      [emails, emailKey_(r[MCOL.email])],
      [phones, phoneKey_(r[MCOL.whatsapp])],
    ].forEach((pair) => {
      if (pair[1]) pair[0].add(pair[1]);
    });
  });
  return { rows: rows, active: active, emails: emails, phones: phones };
}

// a resposta perdida do 1º envio: mesma chave do formulário + mesmo e-mail = o protocolo já gravado
function savedMentorProtocol_(registry, data) {
  if (!data.idempotencyKey) return '';
  const email = data.mentor.email;
  const row = registry.rows.find(
    (r) => String(r[MCOL.key]) === data.idempotencyKey && emailKey_(r[MCOL.email]) === email,
  );
  return row ? String(row[MCOL.protocol]) : '';
}

// null ou a resposta de erro; o site aponta o campo pelo código
function findMentorConflict_(registry, data) {
  const m = data.mentor;
  if (registry.emails.has(m.email)) return { ok: false, error: 'duplicate_email' };
  if (registry.phones.has(m.phoneDigits)) return { ok: false, error: 'duplicate_whatsapp' };
  return null;
}

function appendMentor_(sheet, protocol, data) {
  const m = data.mentor;
  const row = sheet.getLastRow() + 1;
  const values = MENTOR_COLUMNS.map(() => '');
  values[MCOL.protocol] = protocol;
  values[MCOL.date] = new Date();
  values[MCOL.name] = sheetSafe_(m.name);
  values[MCOL.email] = sheetSafe_(m.email);
  values[MCOL.whatsapp] = m.whatsapp;
  values[MCOL.area] = MENTOR_AREA_LABELS[m.area];
  values[MCOL.areaOther] = sheetSafe_(m.areaOther);
  values[MCOL.specialties] = sheetSafe_(m.specialties);
  values[MCOL.graduate] = m.graduate ? 'Sim' : 'Não';
  values[MCOL.course] = sheetSafe_(m.course);
  values[MCOL.gradYear] = m.graduationYear ? String(m.graduationYear) : '';
  values[MCOL.linkedin] = sheetSafe_(m.linkedin);
  values[MCOL.days] = m.days.map((day) => MENTOR_DAY_LABELS[day]).join(', ');
  values[MCOL.publish] = m.mayPublish ? 'Sim' : 'Não';
  values[MCOL.status] = 'novo';
  values[MCOL.source] = sheetSafe_(data.source);
  values[MCOL.consent] = sheetSafe_(data.consent);
  values[MCOL.key] = data.idempotencyKey;
  sheet.appendRow(values);
  setScriptFormula_(sheet.getRange(row, MCOL.chat + 1), mentorChatFormula_(row));
}

// link do WhatsApp montado da célula WhatsApp da mesma linha: corrigiu o número, o link acompanha
function mentorChatFormula_(row) {
  const phone = colLetter_(MCOL.whatsapp) + row;
  const url = '"https://wa.me/55"&REGEXREPLACE(TO_TEXT(' + phone + '),"\\D","")';
  return '=IF(' + phone + '="","",HYPERLINK(' + url + ',"Abrir WhatsApp"))';
}

// referência a uma coluna da aba Mentores, sem o título ('Mentores'!G2:G)
function mentorsColumn_(key) {
  const letter = colLetter_(MCOL[key]);
  return "'" + MENTORS_SHEET + "'!" + letter + '2:' + letter;
}

// ---------------------------------------------------------------------------------------------------------------
// a aba Mentores: criada e formatada na primeira gravação (ou pelo configurarMentores), sem tocar nas outras abas

// rode uma vez no editor (selecione configurarMentores e clique em Executar) pra criar as abas Mentores e
// Resumo Mentores antes do primeiro cadastro. Pode rodar de novo: não apaga dado nem duplica filtro ou proteção
function configurarMentores() {
  // a mesma fila do doPost: cadastro chegando no meio da criação espera, não grava na aba errada
  const lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    setupMentors_(SpreadsheetApp.getActiveSpreadsheet());
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }
  console.log('Abas dos mentores prontas: ' + [MENTORS_SHEET, MENTORS_SUMMARY_SHEET].join(', ') + '.');
}

function mentorsSheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = book.getSheetByName(MENTORS_SHEET);
  const ready =
    String(PropertiesService.getScriptProperties().getProperty(MENTOR_SETUP_PROPERTY) || '') ===
    MENTOR_SETUP_VERSION;
  if (sheet && ready && hasHeaders_(sheet, MENTOR_HEADERS)) return sheet;
  return setupMentors_(book);
}

function setupMentors_(book) {
  // o styleChoices_ (Setup.gs) lê as cores daqui; os status dos mentores ganham as suas
  Object.keys(MENTOR_CHOICE_STYLES).forEach(
    (status) => (CHOICE_STYLES[status] = MENTOR_CHOICE_STYLES[status]),
  );
  const mentors = ensureTab_(book, MENTORS_SHEET, 3);
  const summary = ensureTab_(book, MENTORS_SUMMARY_SHEET, 4);
  styleTable_(mentors, MENTOR_COLUMNS, 3, MENTOR_TAB_COLOR);
  styleChoices_(mentors, MENTOR_COLUMNS.length, [
    { col: MCOL.status, options: MENTOR_STATUS_OPTIONS, colored: MENTOR_STATUS_OPTIONS, dims: 'cancelado' },
  ]);
  for (let row = 2; row <= mentors.getLastRow(); row++) {
    setScriptFormula_(mentors.getRange(row, MCOL.chat + 1), mentorChatFormula_(row));
  }
  writeMentorSummary_(summary);
  PropertiesService.getScriptProperties().setProperty(MENTOR_SETUP_PROPERTY, MENTOR_SETUP_VERSION);
  return mentors;
}

// ---------------------------------------------------------------------------------------------------------------
// aba Resumo Mentores: contadores ao vivo (fórmulas), listas prontas pra copiar e o passo a passo da organização

function mentorSummaryCounters_() {
  const col = mentorsColumn_;
  const active = col('protocol') + ',"<>",' + col('status') + ',"<>cancelado"';
  const countStatus = (status) => '=COUNTIF(' + col('status') + ',"' + status + '")';
  const perArea = MENTOR_AREAS.map((key) => [
    'Área: ' + MENTOR_AREA_LABELS[key],
    '=COUNTIFS(' + active + ',' + col('area') + ',"' + MENTOR_AREA_LABELS[key] + '")',
  ]);
  // o texto da coluna Dias tem todos os dias da pessoa ("11/11 (qua), 13/11 (sex)"): o curinga conta quem tem o dia
  const perDay = MENTOR_DAYS.map((key) => [
    'Disponível em ' + MENTOR_DAY_LABELS[key],
    '=COUNTIFS(' + active + ',' + col('days') + ',"*' + MENTOR_DAY_LABELS[key] + '*")',
  ]);
  return [
    ['Cadastros ativos', '=COUNTIFS(' + active + ')'],
    ['Novos (ainda sem contato)', countStatus('novo')],
    ['Contatados', countStatus('contatado')],
    ['Confirmados', countStatus('confirmado')],
    ['Recusados', countStatus('recusado')],
    ['Cancelados', countStatus('cancelado')],
    ['Egressos da UniCatólica (ativos)', '=COUNTIFS(' + active + ',' + col('graduate') + ',"Sim")'],
    ['Podem aparecer no site (ativos)', '=COUNTIFS(' + active + ',' + col('publish') + ',"Sim")'],
  ].concat(perArea, perDay);
}

// uma célula com a lista inteira, pronta pra colar no campo Cco do e-mail ou numa lista de transmissão
function mentorCopyLists_() {
  const col = mentorsColumn_;
  const status = 'LOWER(TRIM(' + col('status') + '))';
  const join = (key, separator, condition, empty) =>
    '=IFERROR(TEXTJOIN("' +
    separator +
    '",TRUE,FILTER(' +
    col(key) +
    ',' +
    col('protocol') +
    '<>"",' +
    condition +
    ')),"' +
    empty +
    '")';
  return [
    ['E-mails dos mentores ativos', join('email', '; ', status + '<>"cancelado"', 'Nenhum cadastro ainda.')],
    ['E-mails dos confirmados', join('email', '; ', status + '="confirmado"', 'Ninguém confirmado ainda.')],
    [
      'WhatsApps dos mentores ativos',
      join('whatsapp', ', ', status + '<>"cancelado"', 'Nenhum cadastro ainda.'),
    ],
  ];
}

// contagem por valor de uma coluna (curso, outra área), da maior pra menor; vazios ficam fora
function mentorBreakdownFormula_(key) {
  const letter = colLetter_(MCOL[key]);
  const protocol = colLetter_(MCOL.protocol);
  const status = colLetter_(MCOL.status);
  const range = "'" + MENTORS_SHEET + "'!A2:" + colLetter_(MENTOR_COLUMNS.length - 1);
  const query =
    'select ' +
    letter +
    ', count(' +
    protocol +
    ') where ' +
    protocol +
    " <> '' and " +
    status +
    " <> 'cancelado' and " +
    letter +
    " <> '' group by " +
    letter +
    ' order by count(' +
    protocol +
    ') desc label ' +
    letter +
    " '', count(" +
    protocol +
    ") ''";
  return '=IFERROR(QUERY(' + range + ',"' + query + '",0),"Nenhum cadastro ainda.")';
}

function mentorSummaryHowto_(listsRow) {
  const cell = (i) => 'B' + (listsRow + i);
  return [
    [
      'Status',
      'Na aba Mentores, a coluna Status começa em novo. Troque para contatado quando falar com a pessoa, confirmado quando ela fechar presença e recusado ou cancelado se não for participar. Cancelado e recusado deixam de contar nos totais e liberam o e-mail e o WhatsApp para um novo cadastro.',
    ],
    [
      'Equipes',
      'Anote na coluna Equipe(s) atendida(s) a equipe que o mentor acompanha, quando houver. A coluna Anotações da organização é livre.',
    ],
    [
      'Divulgar no site',
      'Só use o nome de quem está com Sim na coluna Pode divulgar no site. Os mentores do site são cadastrados no código (arquivo de speakers); esta planilha não publica nada sozinha.',
    ],
    [
      'Mandar mensagem',
      'Copie a célula ' +
        cell(0) +
        ' ou ' +
        cell(1) +
        ' e cole no campo Cco do e-mail. A célula ' +
        cell(2) +
        ' junta os WhatsApps; a coluna Conversar da aba Mentores abre a conversa com cada pessoa.',
    ],
    [
      'Fechar o cadastro',
      'Nas propriedades do script, crie MENTORES_FECHADOS com o valor sim: o formulário passa a responder que o cadastro está encerrado (apague a propriedade para reabrir). As inscrições dos participantes não são afetadas.',
    ],
    ['Não renomeie', 'Não renomeie as abas nem os títulos das colunas: o script usa esses nomes.'],
  ];
}

function writeMentorSummary_(sheet) {
  sheet.clear();
  sheet.getRange('A1').setValue('HackaRun 2026 · Resumo dos mentores').setFontSize(15).setFontWeight('bold');
  sheet.getRange('A2').setValue('Atualiza sozinho com a aba Mentores. Não precisa editar nada aqui.');
  sheet.getRange('A4:B4').setValues([['Indicador', 'Valor']]);
  const counters = mentorSummaryCounters_();
  writeRows_(sheet, MENTOR_SUMMARY_FIRST_ROW, counters);
  const listsRow = MENTOR_SUMMARY_FIRST_ROW + counters.length + 1;
  const lists = mentorCopyLists_();
  writeRows_(sheet, listsRow, lists);
  const howtoRow = listsRow + lists.length + 1;
  const howto = mentorSummaryHowto_(listsRow);
  sheet.getRange(howtoRow, 1, 1, 2).setValues([['Como usar', '']]);
  writeRows_(sheet, howtoRow + 1, howto);
  // contagens à direita: o QUERY cresce pra baixo sem bater em nada
  sheet.getRange('D4:E4').setValues([['Por curso (egressos)', 'Mentores']]);
  sheet.getRange('G4:H4').setValues([['Outras áreas (texto escrito)', 'Mentores']]);
  setScriptFormula_(sheet.getRange('D5'), mentorBreakdownFormula_('course'));
  setScriptFormula_(sheet.getRange('G5'), mentorBreakdownFormula_('areaOther'));
  ['A4:B4', 'D4:E4', 'G4:H4', 'A' + howtoRow + ':B' + howtoRow].forEach((a1) =>
    sheet.getRange(a1).setFontWeight('bold').setFontColor(BRAND.ice).setBackground(BRAND.night),
  );
  sheet
    .getRange(MENTOR_SUMMARY_FIRST_ROW, 2, counters.length, 1)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');
  sheet
    .getRange(1, 1, howtoRow + howto.length, 2)
    .setWrap(true)
    .setVerticalAlignment('top');
  [300, 560, 24, 260, 100, 24, 260, 100].forEach((width, i) => sheet.setColumnWidth(i + 1, width));
  sheet.setTabColor(MENTOR_TAB_COLOR);
  const protectedAlready = sheet
    .getProtections(SpreadsheetApp.ProtectionType.SHEET)
    .some((p) => p.getDescription() === MENTOR_SUMMARY_PROTECTION);
  if (!protectedAlready) sheet.protect().setDescription(MENTOR_SUMMARY_PROTECTION).setWarningOnly(true);
}

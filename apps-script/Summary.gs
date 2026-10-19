// aba Resumo: contadores ao vivo (fórmulas), listas prontas pra copiar e o passo a passo da organização.
// É refeita a cada configurarPlanilha(); mudou a CAPACITY, rode de novo pra atualizar as vagas

const SUMMARY_PROTECTION = 'HackaRun · resumo (fórmulas automáticas)';
const SUMMARY_FIRST_ROW = 5;

function capacityValue_(config) {
  if (config.capacity === null) return 'sem limite';
  return Number.isNaN(config.capacity) ? 'inválida (confira a propriedade CAPACITY)' : config.capacity;
}

// [rótulo, valor ou fórmula]; as posições viram referência (B5, B6...) nas fórmulas de baixo
function summaryCounters_(config) {
  const col = registrationsColumn_;
  const active = col('protocol') + ',"<>",' + col('status') + ',"<>cancelado"';
  const countStatus = (status) => '=COUNTIF(' + col('status') + ',"' + status + '")';
  const row = (i) => 'B' + (SUMMARY_FIRST_ROW + i);
  const perProfile = PROFILES.map((key) => [
    'Perfil: ' + PROFILE_LABELS[key],
    '=COUNTIFS(' + active + ',' + col('profile') + ',"' + PROFILE_LABELS[key] + '")',
  ]);
  return [
    // inscrição ativa = tudo menos cancelado (a mesma conta do Limits.gs)
    ['Inscrições ativas', '=COUNTIFS(' + active + ')'],
    ['Vagas (propriedade CAPACITY)', capacityValue_(config)],
    ['Vagas restantes', '=IF(ISNUMBER(' + row(1) + '),MAX(0,' + row(1) + '-' + row(0) + '),"sem limite")'],
    ['Credenciados', countStatus('credenciado')],
    ['Ausentes', countStatus('ausente')],
    ['Cancelados', countStatus('cancelado')],
    [
      'Credenciados ainda sem equipe',
      '=COUNTIFS(' + col('status') + ',"credenciado",' + col('team') + ',"")',
    ],
    ['Menores de 18 anos (ativos)', '=COUNTIFS(' + active + ',' + col('adult') + ',"Não")'],
    ['Autorizações pendentes', '=COUNTIFS(' + active + ',' + col('guardian') + ',"pendente")'],
  ].concat(perProfile);
}

// uma célula com a lista inteira, pronta pra colar no campo Cco do e-mail ou numa lista de transmissão
function copyLists_() {
  const col = registrationsColumn_;
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
    [
      'E-mails das inscrições ativas',
      join('email', '; ', status + '<>"cancelado"', 'Nenhuma inscrição ainda.'),
    ],
    [
      'E-mails dos credenciados',
      join('email', '; ', status + '="credenciado"', 'Ninguém credenciado ainda.'),
    ],
    [
      'WhatsApps das inscrições ativas',
      join('whatsapp', ', ', status + '<>"cancelado"', 'Nenhuma inscrição ainda.'),
    ],
  ];
}

// contagem por valor de uma coluna (curso, instituição), da maior pra menor. Rótulos vazios tiram o cabeçalho
// do QUERY (o título fica na linha de cima). As vírgulas dentro do texto do QUERY não mudam em pt_BR
function breakdownFormula_(key) {
  const letter = colLetter_(RCOL[key]);
  const protocol = colLetter_(RCOL.protocol);
  const status = colLetter_(RCOL.status);
  const range = "'" + REGISTRATIONS_SHEET + "'!A2:" + colLetter_(REGISTRATION_COLUMNS.length - 1);
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
  return '=IFERROR(QUERY(' + range + ',"' + query + '",0),"Nenhuma inscrição ainda.")';
}

function summaryHowto_(listsRow) {
  const cell = (i) => 'B' + (listsRow + i);
  return [
    [
      'Credenciamento',
      'No dia, ache a pessoa na aba Inscritos (filtro ou Ctrl+F pelo nome) e troque o Status para credenciado. Quem não comparecer fica como ausente.',
    ],
    [
      'Menores de 18 anos',
      'Confira a autorização do responsável e troque pendente por entregue na coluna Autorização do responsável. A célula fica âmbar enquanto estiver pendente.',
    ],
    [
      'Sorteio das equipes',
      'Na aba Equipes, escreva o nome de cada equipe na coluna Equipe (por exemplo, Equipe Pikachu). Depois, na aba Inscritos, escolha a Equipe de cada pessoa credenciada no menu da coluna Equipe. Integrantes, e-mails e WhatsApps aparecem sozinhos na aba Equipes.',
    ],
    [
      'Insígnia',
      'Suba a imagem (JPG, PNG ou WebP) na pasta das insígnias no Drive, compartilhe como "Qualquer pessoa com o link" (Leitor), copie o ID do link (.../file/d/ID/view) e cole na coluna ID da insígnia da equipe.',
    ],
    [
      'Publicar no site',
      'Troque o Status da equipe para confirmado na aba Equipes. Em até 1 minuto ela aparece no site, só com nome, insígnia e número de integrantes.',
    ],
    [
      'Cancelar',
      'Status cancelado na aba Inscritos: a inscrição deixa de contar e libera a vaga, o e-mail, o WhatsApp e a matrícula para uma nova inscrição.',
    ],
    [
      'Mandar mensagem',
      'Copie a célula ' +
        cell(0) +
        ' ou ' +
        cell(1) +
        ' e cole no campo Cco do e-mail. A célula ' +
        cell(2) +
        ' junta os WhatsApps; a coluna Conversar da aba Inscritos abre a conversa com cada pessoa.',
    ],
    ['Não renomeie', 'Não renomeie as abas nem os títulos das colunas: o script usa esses nomes.'],
  ];
}

function writeSummary_(sheet, config) {
  sheet.clear();
  sheet
    .getRange('A1')
    .setValue('HackaRun 2026 · Resumo das inscrições')
    .setFontSize(15)
    .setFontWeight('bold');
  sheet
    .getRange('A2')
    .setValue('Atualiza sozinho com as abas Inscritos e Equipes. Não precisa editar nada aqui.');
  sheet.getRange('A4:B4').setValues([['Indicador', 'Valor']]);
  const counters = summaryCounters_(config);
  writeRows_(sheet, SUMMARY_FIRST_ROW, counters);
  const listsRow = SUMMARY_FIRST_ROW + counters.length + 1;
  const lists = copyLists_();
  writeRows_(sheet, listsRow, lists);
  const howtoRow = listsRow + lists.length + 1;
  const howto = summaryHowto_(listsRow);
  sheet.getRange(howtoRow, 1, 1, 2).setValues([['Como usar', '']]);
  writeRows_(sheet, howtoRow + 1, howto);
  // contagens à direita: o QUERY cresce pra baixo sem bater em nada
  sheet.getRange('D4:E4').setValues([['Por curso', 'Inscrições']]);
  sheet.getRange('G4:H4').setValues([['Por instituição', 'Inscrições']]);
  setScriptFormula_(sheet.getRange('D5'), breakdownFormula_('course'));
  setScriptFormula_(sheet.getRange('G5'), breakdownFormula_('institution'));
  ['A4:B4', 'D4:E4', 'G4:H4', 'A' + howtoRow + ':B' + howtoRow].forEach((a1) =>
    sheet.getRange(a1).setFontWeight('bold').setFontColor(BRAND.ice).setBackground(BRAND.night),
  );
  sheet
    .getRange(SUMMARY_FIRST_ROW, 2, counters.length, 1)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');
  sheet
    .getRange(1, 1, howtoRow + howto.length, 2)
    .setWrap(true)
    .setVerticalAlignment('top');
  [300, 560, 24, 260, 100, 24, 260, 100].forEach((width, i) => sheet.setColumnWidth(i + 1, width));
  sheet.setTabColor(BRAND.violet);
  const protectedAlready = sheet
    .getProtections(SpreadsheetApp.ProtectionType.SHEET)
    .some((p) => p.getDescription() === SUMMARY_PROTECTION);
  if (!protectedAlready) sheet.protect().setDescription(SUMMARY_PROTECTION).setWarningOnly(true);
}

// texto vai como valor; o que começa com "=" é fórmula do script (setFormula)
function writeRows_(sheet, firstRow, rows) {
  rows.forEach((pair, i) => {
    sheet.getRange(firstRow + i, 1).setValue(pair[0]);
    const cell = sheet.getRange(firstRow + i, 2);
    if (typeof pair[1] === 'string' && pair[1].charAt(0) === '=') setScriptFormula_(cell, pair[1]);
    else cell.setValue(pair[1]);
  });
}

// aba Resumo: contadores ao vivo (fórmulas) e um passo a passo curto pra quem organiza.
// É refeita a cada configurarPlanilha(); mudou a CAPACITY, rode de novo pra atualizar as vagas

const SUMMARY_PROTECTION = 'HackaRun · resumo (fórmulas automáticas)';
const SUMMARY_FIRST_ROW = 5;

// referência a uma coluna inteira da aba Equipes, sem o título ('Equipes'!F2:F)
function teamsColumn_(key) {
  const letter = colLetter_(COL[key]);
  return "'" + TEAMS_SHEET + "'!" + letter + '2:' + letter;
}

function capacityValue_(config) {
  if (config.capacity === null) return 'sem limite';
  return Number.isNaN(config.capacity) ? 'inválida (confira a propriedade CAPACITY)' : config.capacity;
}

// [rótulo, valor ou fórmula]; as posições viram referência (B5, B8...) nas fórmulas de baixo
function summaryCounters_(config) {
  const status = teamsColumn_('status');
  const size = teamsColumn_('size');
  const row = (i) => 'B' + (SUMMARY_FIRST_ROW + i);
  return [
    ['Equipes inscritas', '=COUNTA(' + teamsColumn_('protocol') + ')'],
    ['Confirmadas', '=COUNTIF(' + status + ',"confirmado")'],
    ['Pendentes', '=COUNTIF(' + status + ',"pendente")'],
    ['Recusadas', '=COUNTIF(' + status + ',"recusado")'],
    ['Total de integrantes', '=SUM(' + size + ')'],
    ['Integrantes em equipes confirmadas', '=SUMIF(' + status + ',"confirmado",' + size + ')'],
    ['Capacidade (propriedade CAPACITY)', capacityValue_(config)],
    // vaga ocupada = inscrita e não recusada (a mesma conta do Limits.gs)
    [
      'Vagas restantes',
      '=IF(ISNUMBER(' + row(6) + '),MAX(0,' + row(6) + '-(' + row(0) + '-' + row(3) + ')),"sem limite")',
    ],
  ];
}

function emailLists_() {
  const emails = teamsColumn_('emails');
  const status = 'LOWER(TRIM(' + teamsColumn_('status') + '))';
  const join = (condition, empty) =>
    '=IFERROR(TEXTJOIN("; ",TRUE,FILTER(' + emails + ',' + condition + ')),"' + empty + '")';
  return [
    ['E-mails das equipes confirmadas', join(status + '="confirmado"', 'Nenhuma equipe confirmada ainda.')],
    [
      'E-mails de todas as inscritas (menos recusadas)',
      join(status + '<>"recusado"', 'Nenhuma equipe ainda.'),
    ],
  ];
}

function summaryHowto_(listsRow) {
  const confirmed = 'B' + listsRow;
  const all = 'B' + (listsRow + 1);
  return [
    [
      'Confirmar uma equipe',
      'Na aba Equipes, confira quem é da equipe (coluna Integrantes: nome, matrícula e e-mail de cada pessoa) e a foto (coluna Foto) e troque o Status de pendente para confirmado. Em até 1 minuto a equipe aparece no site, só com nome, foto e número de integrantes.',
    ],
    ['Recusar', 'Status recusado: a equipe sai do site e libera a vaga, o nome, os e-mails e as matrículas.'],
    [
      'Filtrar',
      'Clique no ícone de filtro de qualquer título (Status, Equipe...). Na aba Integrantes dá para filtrar por pessoa, matrícula, e-mail ou pelo Status da equipe.',
    ],
    [
      'Mandar e-mail',
      'A comunicação oficial do HackaRun é por e-mail. Copie a célula ' +
        confirmed +
        ' (confirmadas) ou ' +
        all +
        ' (todas) e cole no campo Para ou Cco do e-mail.',
    ],
    [
      'Tirar uma foto do site',
      'Apague a célula ID da foto da equipe: a miniatura e o site voltam para as iniciais na hora. Pedido de remoção ou imagem imprópria: antes, abra o Link da foto, mova o arquivo para a lixeira e esvazie a lixeira (o link continua público enquanto o arquivo existir).',
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
    .setValue('Atualiza sozinho com as abas Equipes e Integrantes. Não precisa editar nada aqui.');
  sheet.getRange('A4:B4').setValues([['Indicador', 'Valor']]);
  const counters = summaryCounters_(config);
  writeRows_(sheet, SUMMARY_FIRST_ROW, counters);
  const listsRow = SUMMARY_FIRST_ROW + counters.length + 1;
  writeRows_(sheet, listsRow, emailLists_());
  const howtoRow = listsRow + 3;
  const howto = summaryHowto_(listsRow);
  sheet.getRange(howtoRow, 1, 1, 2).setValues([['Como usar', '']]);
  writeRows_(sheet, howtoRow + 1, howto);
  [4, howtoRow].forEach((row) =>
    sheet.getRange(row, 1, 1, 2).setFontWeight('bold').setFontColor(BRAND.ice).setBackground(BRAND.night),
  );
  sheet
    .getRange(SUMMARY_FIRST_ROW, 2, counters.length, 1)
    .setFontWeight('bold')
    .setHorizontalAlignment('left');
  sheet
    .getRange(1, 1, howtoRow + howto.length, 2)
    .setWrap(true)
    .setVerticalAlignment('top');
  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 560);
  sheet.setTabColor('#941BFF');
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

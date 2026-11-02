// leitura da cópia local da planilha (xlsx): abre o arquivo, acha as colunas pelos títulos e devolve as linhas como
// o Apps Script devolveria (draw-list). Quem grava está em xlsx-handler.mjs
import ExcelJS from 'exceljs';

export const INSCRITOS = 'Inscritos';
export const EQUIPES = 'Equipes';
export const SORTEIO = 'Sorteio';
export const SORTEIO_HEADERS = [
  'Nº',
  'Equipe',
  'Pokémon (nº)',
  'Integrantes',
  'Semente',
  'Repetições de nível',
  'Data/hora',
];
export const MAX_ROWS = 1000;

const normalize = (text) =>
  String(text ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

// o valor de uma célula como texto (fórmula vira o resultado; vazio vira '')
export function textOf(cell) {
  const value = cell?.value;
  if (value === null || value === undefined) return '';
  if (typeof value === 'object') {
    if ('result' in value) return String(value.result ?? '');
    if ('richText' in value) return value.richText.map((part) => part.text).join('');
    if ('text' in value) return String(value.text);
    return '';
  }
  return String(value).trim();
}

function columns(sheet) {
  const map = new Map();
  sheet.getRow(1).eachCell({ includeEmpty: false }, (cell, col) => map.set(normalize(textOf(cell)), col));
  return map;
}

function need(map, title, sheetName) {
  const col = map.get(normalize(title));
  if (!col) throw new Error(`Não achei a coluna "${title}" na aba ${sheetName}.`);
  return col;
}

export class Conflict extends Error {}

export async function open(file) {
  const book = new ExcelJS.Workbook();
  await book.xlsx.readFile(file);
  const inscritos = book.getWorksheet(INSCRITOS);
  const equipes = book.getWorksheet(EQUIPES);
  if (!inscritos || !equipes) throw new Error('A planilha precisa ter as abas Inscritos e Equipes.');
  let sorteio = book.getWorksheet(SORTEIO);
  if (!sorteio) {
    sorteio = book.addWorksheet(SORTEIO);
    sorteio.addRow(SORTEIO_HEADERS).font = { bold: true };
  }
  const ins = columns(inscritos);
  const eq = columns(equipes);
  return {
    book,
    inscritos,
    equipes,
    sorteio,
    c: {
      protocol: need(ins, 'Protocolo', INSCRITOS),
      name: need(ins, 'Nome completo', INSCRITOS),
      profile: need(ins, 'Perfil', INSCRITOS),
      institution: need(ins, 'Instituição', INSCRITOS),
      period: need(ins, 'Período', INSCRITOS),
      status: need(ins, 'Status', INSCRITOS),
      team: need(ins, 'Equipe', INSCRITOS),
      teamName: need(eq, 'Equipe', EQUIPES),
      teamStatus: need(eq, 'Status', EQUIPES),
    },
  };
}

export function inscritosRows(ctx) {
  const rows = [];
  for (let i = 2; i <= Math.min(ctx.inscritos.rowCount, MAX_ROWS); i++) {
    const row = ctx.inscritos.getRow(i);
    const protocol = textOf(row.getCell(ctx.c.protocol));
    if (!protocol) continue;
    rows.push({
      index: i,
      protocol,
      name: textOf(row.getCell(ctx.c.name)),
      profile: textOf(row.getCell(ctx.c.profile)),
      institution: textOf(row.getCell(ctx.c.institution)),
      period: textOf(row.getCell(ctx.c.period)),
      status: normalize(textOf(row.getCell(ctx.c.status))),
      team: textOf(row.getCell(ctx.c.team)),
    });
  }
  return rows;
}

export function sorteioRows(ctx) {
  const rows = [];
  for (let i = 2; i <= ctx.sorteio.rowCount; i++) {
    const row = ctx.sorteio.getRow(i);
    const number = Number(textOf(row.getCell(1)));
    if (!number) continue;
    const pokemon = Number(textOf(row.getCell(3)));
    rows.push({ index: i, number, name: textOf(row.getCell(2)), pokemonId: pokemon || null });
  }
  return rows;
}

export function list(ctx) {
  const people = inscritosRows(ctx);
  const accredited = people
    .filter((p) => p.status === 'credenciado')
    .map(({ protocol, name, profile, institution, period, team }) => ({
      protocol,
      name,
      profile,
      institution,
      period,
      team,
    }));
  const confirmed = new Set();
  for (let i = 2; i <= MAX_ROWS; i++) {
    const row = ctx.equipes.getRow(i);
    if (normalize(textOf(row.getCell(ctx.c.teamStatus))) === 'confirmado')
      confirmed.add(textOf(row.getCell(ctx.c.teamName)));
  }
  const teams = sorteioRows(ctx).map((t) => ({
    number: t.number,
    name: t.name,
    pokemonId: t.pokemonId,
    published: confirmed.has(t.name),
    members: people
      .filter((p) => p.team === t.name && p.status !== 'cancelado')
      .map((p) => ({ id: p.protocol, name: p.name })),
  }));
  return { ok: true, accredited, teams };
}

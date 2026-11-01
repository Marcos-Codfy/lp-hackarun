// "planilha" local do sorteio: lê e grava uma CÓPIA do xlsx da planilha (nunca a do Drive), com o mesmo protocolo que o
// apps-script/Draw.gs terá no dia (draw-list, draw-save, draw-names). Só roda no servidor de desenvolvimento da
// organização (npm run sorteio); nada disto vai pro site público

import { Conflict, MAX_ROWS, inscritosRows, list, open, sorteioRows, textOf } from './xlsx-sheet.mjs';

// primeira linha livre da coluna "Equipe" na aba Equipes (as fórmulas das outras colunas já vêm prontas)
function freeTeamRow(ctx) {
  for (let i = 2; i <= MAX_ROWS; i++) {
    if (!textOf(ctx.equipes.getRow(i).getCell(ctx.c.teamName))) return i;
  }
  throw new Conflict('A aba Equipes está cheia.');
}

function teamRowByName(ctx, name) {
  for (let i = 2; i <= MAX_ROWS; i++) {
    if (textOf(ctx.equipes.getRow(i).getCell(ctx.c.teamName)) === name) return i;
  }
  return null;
}

function clearPreviousDraw(ctx, people) {
  const previous = sorteioRows(ctx);
  if (previous.some((t) => t.pokemonId !== null))
    throw new Conflict('Alguma equipe já tem nome: não dá para refazer.');
  const names = new Set(previous.map((t) => t.name));
  for (const person of people) {
    if (names.has(person.team)) ctx.inscritos.getRow(person.index).getCell(ctx.c.team).value = null;
  }
  for (const name of names) {
    const row = teamRowByName(ctx, name);
    if (row) {
      ctx.equipes.getRow(row).getCell(ctx.c.teamName).value = null;
      ctx.equipes.getRow(row).getCell(ctx.c.teamStatus).value = null;
    }
  }
  for (const row of previous.sort((a, b) => b.index - a.index)) ctx.sorteio.spliceRows(row.index, 1);
}

function save(ctx, body) {
  const teams = Array.isArray(body.teams) ? body.teams : [];
  if (teams.length === 0) throw new Error('Nenhuma equipe para salvar.');
  let people = inscritosRows(ctx);
  const previous = sorteioRows(ctx);
  if (previous.length > 0 && !body.replace) throw new Conflict('Já existe um sorteio salvo.');
  if (previous.length > 0) {
    clearPreviousDraw(ctx, people);
    people = inscritosRows(ctx);
  }
  const byProtocol = new Map(people.map((p) => [p.protocol, p]));
  const seen = new Set();
  for (const team of teams) {
    for (const id of team.members ?? []) {
      const person = byProtocol.get(id);
      if (!person || person.status !== 'credenciado') throw new Conflict(`${id} não está credenciado.`);
      if (person.team) throw new Conflict(`${person.name} já está na equipe "${person.team}".`);
      if (seen.has(id)) throw new Conflict(`${id} aparece em duas equipes.`);
      seen.add(id);
    }
  }
  const stamp = new Date();
  for (const team of teams) {
    const name = `Equipe ${team.number}`;
    const row = ctx.equipes.getRow(freeTeamRow(ctx));
    row.getCell(ctx.c.teamName).value = name;
    row.getCell(ctx.c.teamStatus).value = 'pendente';
    for (const id of team.members)
      ctx.inscritos.getRow(byProtocol.get(id).index).getCell(ctx.c.team).value = name;
    ctx.sorteio.addRow([
      team.number,
      name,
      null,
      team.members.length,
      body.seed ?? '',
      body.levelRepeats ?? 0,
      stamp,
    ]);
  }
  return { ok: true, saved: teams.length };
}

// dá nome a várias equipes de uma vez: confere tudo antes de gravar (ou grava tudo, ou nada)
function nameTeams(ctx, body) {
  const items = Array.isArray(body.items) ? body.items : [body];
  if (items.length === 0) throw new Error('Nenhuma equipe para nomear.');
  const teams = sorteioRows(ctx);
  const usedPokemon = new Set(teams.map((t) => t.pokemonId).filter(Boolean));
  const usedNames = new Set(teams.map((t) => t.name));
  const seenTeams = new Set();
  const plan = [];
  for (const item of items) {
    const number = Number(item.number);
    const pokemonId = Number(item.pokemonId);
    const newName = String(item.name ?? '').trim();
    if (!number || !pokemonId || !newName) throw new Error('Faltam o número da equipe, o Pokémon ou o nome.');
    const team = teams.find((t) => t.number === number);
    if (!team) throw new Conflict(`A Equipe ${number} não está salva.`);
    if (team.pokemonId !== null || seenTeams.has(number))
      throw new Conflict(`A ${team.name} já foi sorteada.`);
    if (usedPokemon.has(pokemonId)) throw new Conflict('Esse Pokémon já foi sorteado para outra equipe.');
    if (usedNames.has(newName)) throw new Conflict('Já existe uma equipe com esse nome.');
    seenTeams.add(number);
    usedPokemon.add(pokemonId);
    usedNames.add(newName);
    plan.push({ team, pokemonId, newName });
  }
  const people = inscritosRows(ctx);
  for (const { team, pokemonId, newName } of plan) {
    const row = teamRowByName(ctx, team.name);
    if (row) ctx.equipes.getRow(row).getCell(ctx.c.teamName).value = newName;
    for (const person of people) {
      if (person.team === team.name) ctx.inscritos.getRow(person.index).getCell(ctx.c.team).value = newName;
    }
    const sorteioRow = ctx.sorteio.getRow(team.index);
    sorteioRow.getCell(2).value = newName;
    sorteioRow.getCell(3).value = pokemonId;
  }
  return { ok: true, named: plan.length };
}

// uma operação por vez: duas gravações juntas se atropelariam no mesmo arquivo
let queue = Promise.resolve();

export function handleDrawAction(file, body) {
  const run = async () => {
    try {
      const ctx = await open(file);
      let out;
      if (body.action === 'draw-list') return list(ctx);
      if (body.action === 'draw-save') out = save(ctx, body);
      else if (body.action === 'draw-names' || body.action === 'draw-name') out = nameTeams(ctx, body);
      else return { ok: false, error: 'unknown-action' };
      await ctx.book.xlsx.writeFile(file);
      return out;
    } catch (error) {
      if (error instanceof Conflict) return { ok: false, error: 'conflict', message: error.message };
      return { ok: false, error: 'server', message: error instanceof Error ? error.message : String(error) };
    }
  };
  const next = queue.then(run, run);
  queue = next.catch(() => undefined);
  return next;
}

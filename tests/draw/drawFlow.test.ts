// @vitest-environment node
// o sorteio de ponta a ponta, sem navegador: casos de uso + gateway da planilha + a "planilha" local (xlsx de teste)
import { describe, expect, it } from 'vitest';
import { DrawGatewayError } from '@application/draw/DrawGateway';
import { GenerateTeamDraw, SaveTeamDraw } from '@application/draw/TeamDrawUseCases';
import { createRandom } from '@domain/index';
import { SheetDrawGateway } from '@infrastructure/draw/SheetDrawGateway';
import { FileTransport, setup } from './drawSetup';
import { crowd, makeWorkbook, readSheet } from './xlsxFixture';

const teamCells = async (file: string) => (await readSheet(file, 'Inscritos')).slice(1).map((row) => row[6]);

describe('sorteio das equipes · tela 1', () => {
  it('lê só os credenciados e forma as equipes, sem gravar nada na planilha', async () => {
    const { generate, file } = await setup(24);
    const preview = await generate.execute('semente-fixa');
    expect(preview.ok).toBe(true);
    if (!preview.ok) return;
    expect(preview.value.result.report).toMatchObject({ participants: 24, teams: 6 });
    expect(preview.value.alreadySaved).toBe(false);
    expect((await teamCells(file)).every((cell) => !cell)).toBe(true);
    // a aba Sorteio nem chega a ser gravada: a tela 1 só lê
    expect((await readSheet(file, 'Sorteio')).length).toBeLessThanOrEqual(1);
  });

  it('quem não foi credenciado (ausente, inscrito, cancelado) fica de fora', async () => {
    const people = crowd(10).map((p, i) => ({
      ...p,
      status: i < 8 ? 'credenciado' : ['ausente', 'cancelado'][i - 8],
    }));
    const file = await makeWorkbook(people);
    const gateway = new SheetDrawGateway(new FileTransport(file));
    const preview = await new GenerateTeamDraw(gateway, () => new Date(), createRandom('a')).execute('s');
    expect(preview.ok && preview.value.result.report.participants).toBe(8);
  });

  it('a mesma semente refaz o mesmo sorteio', async () => {
    const { generate } = await setup(24);
    const shape = async () => {
      const r = await generate.execute('repete');
      if (!r.ok) throw new Error(r.error);
      return r.value.result.teams.map((t) => t.members.map((m) => m.id));
    };
    expect(await shape()).toEqual(await shape());
  });

  it('sem credenciados, a tela recebe o aviso em vez de um sorteio vazio', async () => {
    const file = await makeWorkbook(crowd(5).map((p) => ({ ...p, status: 'inscrito' })));
    const gateway = new SheetDrawGateway(new FileTransport(file));
    const preview = await new GenerateTeamDraw(gateway, () => new Date(), createRandom('a')).execute();
    expect(preview).toMatchObject({ ok: false });
  });
});

describe('sorteio das equipes · salvar na planilha', () => {
  it('grava Equipe N em cada pessoa, cria as equipes e registra a semente', async () => {
    const { generate, save, file } = await setup(26);
    const preview = await generate.execute('grava');
    if (!preview.ok) throw new Error(preview.error);
    expect((await save.execute(preview.value.result)).ok).toBe(true);

    const cells = await teamCells(file);
    expect(cells.every((cell) => typeof cell === 'string' && /^Equipe \d+$/.test(cell))).toBe(true);
    const teams = (await readSheet(file, 'Equipes')).slice(1).filter((row) => row[0]);
    expect(teams.map((row) => [row[0], row[2]])).toEqual(
      Array.from({ length: 6 }, (_, i) => [`Equipe ${i + 1}`, 'pendente']),
    );
    const log = (await readSheet(file, 'Sorteio')).slice(1);
    expect(log).toHaveLength(6);
    expect(log[0]?.slice(0, 5)).toEqual([1, 'Equipe 1', null, expect.any(Number), 'grava']);

    // quem está em cada equipe bate com o que a tela mostrou
    const saved = await new SheetDrawGateway(new FileTransport(file)).loadSavedTeams();
    const shown = new Map(
      preview.value.result.teams.map((t) => [t.number, t.members.map((m) => m.id).sort()]),
    );
    for (const team of saved) expect(team.members.map((m) => m.id).sort()).toEqual(shown.get(team.number));
  });

  it('as equipes têm 4 e, com sobra, até 5 (26 pessoas = 6 equipes: 4 de 4 e 2 de 5)', async () => {
    const { generate, save, gateway } = await setup(26);
    const preview = await generate.execute('tamanhos');
    if (!preview.ok) throw new Error(preview.error);
    await save.execute(preview.value.result);
    const sizes = (await gateway.loadSavedTeams()).map((t) => t.members.length).sort();
    expect(sizes).toEqual([4, 4, 4, 4, 5, 5]);
  });

  it('refazer o sorteio antes de dar nomes troca as equipes salvas, sem sobrar equipe antiga', async () => {
    const { generate, save, file, gateway } = await setup(24);
    const first = await generate.execute('um');
    if (!first.ok) throw new Error(first.error);
    await save.execute(first.value.result);
    const again = await generate.execute('dois');
    if (!again.ok) throw new Error(again.error);
    expect(again.value.alreadySaved).toBe(true);
    expect(again.value.locked).toBe(false);
    await save.execute(again.value.result);
    expect((await gateway.loadSavedTeams()).map((t) => t.members.length)).toEqual([4, 4, 4, 4, 4, 4]);
    expect((await readSheet(file, 'Equipes')).slice(1).filter((row) => row[0])).toHaveLength(6);
    expect((await readSheet(file, 'Sorteio')).slice(1)).toHaveLength(6);
  });

  it('não grava por cima de quem já tem equipe escolhida à mão na planilha', async () => {
    const people = crowd(8).map((p, i) => (i === 0 ? { ...p, team: 'Equipe Manual' } : p));
    const file = await makeWorkbook(people);
    const gateway = new SheetDrawGateway(new FileTransport(file));
    const preview = await new GenerateTeamDraw(gateway, () => new Date(), createRandom('a')).execute('s');
    if (!preview.ok) throw new Error(preview.error);
    await expect(new SaveTeamDraw(gateway).execute(preview.value.result)).rejects.toMatchObject({
      kind: 'conflict',
    });
    expect((await teamCells(file))[0]).toBe('Equipe Manual');
  });

  it('salvar duas vezes sem pedir para trocar é conflito (ninguém é duplicado)', async () => {
    const { generate, gateway } = await setup(8);
    const preview = await generate.execute('dup');
    if (!preview.ok) throw new Error(preview.error);
    await gateway.saveTeams(preview.value.result, { replace: false });
    await expect(gateway.saveTeams(preview.value.result, { replace: false })).rejects.toBeInstanceOf(
      DrawGatewayError,
    );
  });
});

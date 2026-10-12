import { describe, expect, it } from 'vitest';
import { ListTeams } from '@application/index';
import { Team, type TeamStatus } from '@domain/index';
import { teamName } from '../helpers/fixtures';

const team = (id: string, name: string, status: TeamStatus = 'confirmed') =>
  Team.create({ id, name: teamName(name), memberCount: 2, status });

const useCase = new ListTeams({
  list: async () => [
    team('1', 'Zebra Code'),
    team('2', 'Árvore Binária', 'pending'),
    team('3', 'Ágil Demais'),
    team('4', 'bit a bit'),
  ],
});

describe('ListTeams', () => {
  it('confirmadas primeiro, depois ordem alfabética pt-BR', async () => {
    const names = (await useCase.execute()).map((t) => t.name);
    expect(names).toEqual(['Ágil Demais', 'bit a bit', 'Zebra Code', 'Árvore Binária']);
  });

  it('busca ignorando acento e caixa', async () => {
    expect((await useCase.execute('ARVORE')).map((t) => t.id)).toEqual(['2']);
    expect((await useCase.execute('  agil ')).map((t) => t.id)).toEqual(['3']);
    expect(await useCase.execute('nada a ver')).toEqual([]);
  });

  it('expõe a quantidade de integrantes no DTO', async () => {
    const [first] = await useCase.execute('zebra');
    expect(first?.memberCount).toBe(2);
    expect(first?.status).toBe('confirmed');
  });
});

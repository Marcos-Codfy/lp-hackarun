import { describe, expect, it } from 'vitest';
import { ListTeams, type SlotsDTO } from '@application/index';
import { Team, type TeamRepository } from '@domain/index';
import { TeamsViewModel, type PublicTeam } from '@presentation/view-models/teams/TeamsViewModel';
import { teamName } from '../helpers/fixtures';

const initial: PublicTeam[] = [
  { id: '1', name: 'Café com Código', course: 'Engenharia de Software', memberCount: 4 },
  { id: '2', name: 'Null Pointers', course: 'Ciência da Computação', memberCount: 3 },
];
const SLOTS: SlotsDTO = { capacity: 10, taken: 2, remaining: 8, level: 'plenty' };

const team = (id: string, name: string, status: 'confirmed' | 'pending' = 'confirmed') =>
  Team.create({
    id,
    name: teamName(name),
    members: [],
    memberCount: 5,
    course: null,
    mentor: null,
    status,
  });

function setup(repo: TeamRepository | null, now = () => 0) {
  return new TeamsViewModel({ initial, slots: SLOTS, listTeams: repo ? new ListTeams(repo) : null, now });
}

describe('TeamsViewModel', () => {
  it('filtra por nome ou curso ignorando acento', () => {
    const vm = setup(null);
    vm.setQuery('cafe');
    expect(vm.state.value.visible.map((t) => t.id)).toEqual(['1']);
    vm.setQuery('CIÊNCIA');
    expect(vm.state.value.visible.map((t) => t.id)).toEqual(['2']);
    vm.setQuery('');
    expect(vm.state.value.visible).toHaveLength(2);
  });

  it('sem planilha não faz refresh', async () => {
    const vm = setup(null);
    await vm.refresh();
    expect(vm.isLive).toBe(false);
    expect(vm.state.value.status).toBe('idle');
  });

  it('refresh troca pela lista ao vivo (só confirmadas), mantém a busca e recalcula vagas', async () => {
    const vm = setup({
      list: async () => [team('a', 'Alfa Squad'), team('b', 'Beta Bugs', 'pending'), team('c', 'Café Turbo')],
    });
    vm.setQuery('cafe');
    await vm.refresh();
    const s = vm.state.value;
    expect(s.status).toBe('ready');
    expect(s.teams.map((t) => t.id)).toEqual(['a', 'c']);
    expect(s.visible.map((t) => t.id)).toEqual(['c']);
    expect(s.slots).toEqual({ capacity: 10, taken: 2, remaining: 8, level: 'plenty' });
    expect(s.teams[0]).toEqual({ id: 'a', name: 'Alfa Squad', course: null, memberCount: 5 });
  });

  it('erro é silencioso: a lista atual continua', async () => {
    const vm = setup({ list: () => Promise.reject(new Error('offline')) });
    await vm.refresh();
    expect(vm.state.value.status).toBe('error');
    expect(vm.state.value.teams).toEqual(initial);
  });

  it('refreshIfStale respeita o cache de 60s da planilha', async () => {
    let calls = 0;
    let clock = 1_000;
    const vm = setup(
      {
        list: async () => {
          calls++;
          return [];
        },
      },
      () => clock,
    );
    await vm.refreshIfStale();
    await vm.refreshIfStale();
    expect(calls).toBe(1);
    clock += 61_000;
    await vm.refreshIfStale();
    expect(calls).toBe(2);
  });
});

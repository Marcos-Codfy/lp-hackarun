import type { SavedTeam } from '@application/draw/DrawGateway';
import type { DrawServices } from '@composition/draw';
import { TeamNamesViewModel, type TeamNamesState } from '@presentation/view-models/draw/TeamNamesViewModel';
import { h, mustFind, pokemonImage } from './dom';

const SPIN_MS = 110;

// 2ª tela do sorteio: um Pokémon (e o nome) para cada equipe, sem repetir
export function mountNamesPage(services: DrawServices): TeamNamesViewModel {
  const { catalog } = services;
  const byId = new Map(catalog.map((p) => [p.id, p]));
  const vm = new TeamNamesViewModel({ status: services.status, names: services.names, catalog });
  const stats = mustFind('[data-stats]');
  const message = mustFind<HTMLElement>('[data-message]');
  const grid = mustFind('[data-grid]');
  const drawAll = mustFind<HTMLButtonElement>('[data-draw-all]');
  let spinTimer = 0;

  const randomCatalogId = () => (catalog[Math.floor(Math.random() * catalog.length)] as { id: number }).id;

  // imagens passando enquanto a planilha grava: o resultado de verdade vem do servidor
  const spin = (numbers: readonly number[]) => {
    window.clearInterval(spinTimer);
    if (numbers.length === 0) return;
    spinTimer = window.setInterval(() => {
      for (const number of numbers) {
        const img = grid.querySelector<HTMLImageElement>(`[data-logo="${number}"] img`);
        if (img) img.src = pokemonImage(randomCatalogId());
      }
    }, SPIN_MS);
  };

  const card = (team: SavedTeam, spinning: boolean): HTMLElement => {
    const pokemon = team.pokemonId !== null ? byId.get(team.pokemonId) : undefined;
    const named = team.pokemonId !== null;
    return h(
      'article',
      { class: 'poke', 'data-state': spinning ? 'spinning' : named ? 'done' : 'pending' },
      h('span', { class: 'poke__number' }, `Equipe ${team.number}`),
      h(
        'div',
        { class: 'poke__logo', 'data-logo': String(team.number) },
        spinning || named
          ? h('img', {
              src: pokemonImage(named ? (team.pokemonId as number) : randomCatalogId()),
              alt: pokemon ? pokemon.name : '',
              width: '160',
              height: '160',
            })
          : h('span', { class: 'poke__question', 'aria-hidden': 'true' }, '?'),
      ),
      h('h3', { class: 'poke__name' }, named ? team.name : spinning ? 'Sorteando…' : `Equipe ${team.number}`),
      h(
        'p',
        { class: 'poke__meta' },
        pokemon ? pokemon.types.join(' · ') : `${team.members.length} integrantes`,
      ),
      h(
        'details',
        { class: 'poke__members' },
        h('summary', {}, `${team.members.length} integrantes`),
        h('ul', {}, ...team.members.map((m) => h('li', {}, m.name))),
      ),
      h(
        'button',
        {
          class: 'btn btn--primary',
          type: 'button',
          'data-draw-one': String(team.number),
          disabled: named || spinning || undefined,
        },
        named ? 'Já sorteada' : 'Sortear nome',
      ),
    );
  };

  const render = (state: TeamNamesState) => {
    const named = state.teams.filter((t) => t.pokemonId !== null).length;
    stats.replaceChildren(
      h(
        'div',
        { class: 'stat' },
        h('span', { class: 'stat__value' }, String(state.teams.length)),
        h('span', { class: 'stat__label' }, 'equipes'),
      ),
      h(
        'div',
        { class: 'stat' },
        h('span', { class: 'stat__value' }, String(named)),
        h('span', { class: 'stat__label' }, 'já com nome'),
      ),
      h(
        'div',
        { class: 'stat' },
        h('span', { class: 'stat__value' }, String(state.remaining)),
        h('span', { class: 'stat__label' }, 'Pokémon restantes'),
      ),
    );
    const pending = state.teams.length - named;
    drawAll.disabled = state.loading || state.spinning.length > 0 || pending === 0;
    drawAll.textContent =
      state.spinning.length > 0
        ? 'Sorteando…'
        : pending === 0 && state.teams.length > 0
          ? 'Todas sorteadas ✓'
          : 'Sortear todas';

    message.replaceChildren();
    message.dataset['kind'] = state.error ? 'error' : '';
    if (state.error) message.append(state.error);
    else if (!state.loading && state.teams.length === 0) {
      message.append(
        'Ainda não há equipes salvas. ',
        h('a', { href: '/sorteio' }, '← Sortear as equipes primeiro'),
      );
    }
    grid.replaceChildren(...state.teams.map((t) => card(t, state.spinning.includes(t.number))));
    spin(state.spinning);
  };

  vm.state.subscribe(render);
  drawAll.addEventListener('click', () => void vm.drawAll());
  grid.addEventListener('click', (event) => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-draw-one]');
    if (button) void vm.drawOne(Number(button.dataset['drawOne']));
  });
  void vm.load();
  return vm;
}

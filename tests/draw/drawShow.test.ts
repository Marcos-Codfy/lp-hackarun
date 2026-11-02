// o "show" do sorteio: tempos da cascata, cor por tipo e a revelação das equipes (inclusive pular com "Revelar tudo")
import { afterEach, describe, expect, it, vi } from 'vitest';
import { revealTeams } from '@presentation/views/draw/TeamsReveal';
import {
  cascadeDelays,
  NAME_REVEAL,
  staggerFor,
  TEAM_REVEAL,
  typeColor,
} from '@presentation/views/draw/fx/timing';
import type { DrawSound } from '@presentation/views/draw/fx/sound';

const silent = { pop: vi.fn(), tick: vi.fn(), ding: vi.fn(), fanfare: vi.fn() } as unknown as DrawSound;

function cards(teams: string[][]): HTMLElement[] {
  document.body.innerHTML = '';
  return teams.map((members) => {
    const card = document.createElement('article');
    card.className = 'team team--waiting';
    const list = document.createElement('ul');
    for (const name of members) {
      const li = document.createElement('li');
      const span = document.createElement('span');
      span.className = 'member__name';
      span.dataset['name'] = name;
      span.textContent = '???';
      li.append(span);
      list.append(li);
    }
    card.append(list);
    document.body.append(card);
    return card;
  });
}

const shown = (all: HTMLElement[]) =>
  all.flatMap((c) => [...c.querySelectorAll<HTMLElement>('.member__name')].map((el) => el.textContent));

afterEach(() => {
  vi.useRealTimers();
});

describe('tempos do show', () => {
  it('46 equipes cabem no tempo máximo da cascata, sem passar do intervalo preferido', () => {
    expect(staggerFor(46, TEAM_REVEAL.staggerMs, TEAM_REVEAL.maxTotalMs)).toBeLessThanOrEqual(
      TEAM_REVEAL.staggerMs,
    );
    const teams = cascadeDelays(46, TEAM_REVEAL.staggerMs, TEAM_REVEAL.maxTotalMs);
    expect(teams.at(-1)).toBeLessThanOrEqual(TEAM_REVEAL.maxTotalMs);
    const names = cascadeDelays(46, NAME_REVEAL.staggerMs, NAME_REVEAL.maxTotalMs);
    expect(names.at(-1)).toBeLessThanOrEqual(NAME_REVEAL.maxTotalMs);
    // e com 100 equipes o total continua dentro do limite
    expect(cascadeDelays(100, NAME_REVEAL.staggerMs, NAME_REVEAL.maxTotalMs).at(-1)).toBeLessThanOrEqual(
      NAME_REVEAL.maxTotalMs,
    );
  });

  it('poucas equipes usam o intervalo cheio; uma equipe entra na hora', () => {
    expect(cascadeDelays(3, 250, 11_000)).toEqual([0, 250, 500]);
    expect(cascadeDelays(1, 250, 11_000)).toEqual([0]);
    expect(cascadeDelays(0, 250, 11_000)).toEqual([]);
  });

  it('cada tipo tem a sua cor e tipo desconhecido cai no ciano do HackaRun', () => {
    expect(typeColor(['fire', 'flying'])).toBe('#ff6b3d');
    expect(typeColor(['water'])).toBe('#3d8bff');
    expect(typeColor([])).toBe('#00e5ff');
    expect(typeColor(['???'])).toBe('#00e5ff');
  });
});

describe('revealTeams', () => {
  it('a roleta termina com cada nome certo, na ordem, e conta o progresso até o total', async () => {
    vi.useFakeTimers();
    const all = cards([
      ['Ana', 'Bia'],
      ['Caio', 'Duda'],
      ['Eva', 'Fabi'],
    ]);
    const progress: number[] = [];
    const reveal = revealTeams(all, {
      names: ['Ana', 'Bia', 'Caio', 'Duda', 'Eva', 'Fabi'],
      reduced: false,
      sound: silent,
      onProgress: (n) => progress.push(n),
    });
    // no começo todo mundo ainda está escondido
    expect(all.every((c) => c.classList.contains('team--waiting'))).toBe(true);
    await vi.advanceTimersByTimeAsync(5000);
    await reveal.done;
    expect(shown(all)).toEqual(['Ana', 'Bia', 'Caio', 'Duda', 'Eva', 'Fabi']);
    expect(all.every((c) => c.classList.contains('team--in'))).toBe(true);
    expect(progress).toEqual([1, 2, 3]);
    expect(document.querySelectorAll('li.locked')).toHaveLength(6);
  });

  it('"Revelar tudo" no meio da cascata mostra tudo na hora, com os nomes certos', async () => {
    vi.useFakeTimers();
    const all = cards([['Ana'], ['Bia'], ['Caio'], ['Duda']]);
    const reveal = revealTeams(all, {
      names: ['X', 'Y'],
      reduced: false,
      sound: silent,
      onProgress: () => undefined,
    });
    await vi.advanceTimersByTimeAsync(300);
    reveal.skip();
    await reveal.done;
    expect(shown(all)).toEqual(['Ana', 'Bia', 'Caio', 'Duda']);
    // nenhum timer pendente troca o nome depois de pular
    await vi.advanceTimersByTimeAsync(5000);
    expect(shown(all)).toEqual(['Ana', 'Bia', 'Caio', 'Duda']);
  });

  it('quem pede menos movimento vê o resultado direto, sem cascata', async () => {
    const all = cards([['Ana'], ['Bia']]);
    const progress: number[] = [];
    const reveal = revealTeams(all, {
      names: [],
      reduced: true,
      sound: silent,
      onProgress: (n) => progress.push(n),
    });
    await reveal.done;
    expect(shown(all)).toEqual(['Ana', 'Bia']);
    expect(progress).toEqual([2]);
  });
});

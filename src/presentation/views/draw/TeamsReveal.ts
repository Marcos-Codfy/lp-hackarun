// revelação das equipes sorteadas: os cards entram em cascata e os nomes de cada um giram como uma roleta antes de
// travar no nome certo. Só mexe no que já está no DOM (cards montados com .team--waiting e o nome certo em data-name)
import type { DrawSound } from './fx/sound';
import { cascadeDelays, TEAM_REVEAL } from './fx/timing';

export interface TeamsReveal {
  done: Promise<void>;
  skip(): void;
}

interface Options {
  // nomes de todo mundo que entrou no sorteio (a roleta gira por eles)
  names: readonly string[];
  reduced: boolean;
  sound: DrawSound;
  // quantas equipes já estão inteiras na tela
  onProgress(revealed: number, total: number): void;
}

function lock(card: HTMLElement): void {
  card.classList.remove('team--waiting');
  card.classList.add('team--in');
  card.querySelectorAll<HTMLElement>('.member__name').forEach((el) => {
    el.textContent = el.dataset['name'] ?? '';
    el.closest('li')?.classList.add('locked');
  });
}

export function revealTeams(cards: readonly HTMLElement[], options: Options): TeamsReveal {
  const total = cards.length;
  let revealed = 0;
  let finish: () => void = () => undefined;
  const done = new Promise<void>((resolve) => (finish = resolve));
  const timeouts: number[] = [];
  const intervals: number[] = [];
  let finished = false;

  const complete = () => {
    if (finished) return;
    finished = true;
    timeouts.forEach((t) => window.clearTimeout(t));
    intervals.forEach((t) => window.clearInterval(t));
    finish();
  };

  const skip = () => {
    cards.forEach(lock);
    revealed = total;
    options.onProgress(total, total);
    complete();
  };

  if (options.reduced || total === 0) {
    skip();
    return { done, skip };
  }

  const randomName = () => options.names[Math.floor(Math.random() * options.names.length)] ?? '';
  const delays = cascadeDelays(total, TEAM_REVEAL.staggerMs, TEAM_REVEAL.maxTotalMs);

  cards.forEach((card, index) => {
    timeouts.push(
      window.setTimeout(() => {
        card.classList.remove('team--waiting');
        card.classList.add('team--in');
        options.sound.pop();
        const names = [...card.querySelectorAll<HTMLElement>('.member__name')];
        let pending = names.length;
        if (pending === 0) {
          revealed++;
          options.onProgress(revealed, total);
          if (revealed === total) complete();
        }
        names.forEach((el, i) => {
          const spin = window.setInterval(() => (el.textContent = randomName()), TEAM_REVEAL.slotTickMs);
          intervals.push(spin);
          timeouts.push(
            window.setTimeout(
              () => {
                window.clearInterval(spin);
                el.textContent = el.dataset['name'] ?? '';
                el.closest('li')?.classList.add('locked');
                pending--;
                if (pending > 0) return;
                revealed++;
                options.onProgress(revealed, total);
                if (revealed === total) complete();
              },
              TEAM_REVEAL.slotMs + i * 60,
            ),
          );
        });
      }, delays[index] ?? 0),
    );
  });

  return { done, skip };
}

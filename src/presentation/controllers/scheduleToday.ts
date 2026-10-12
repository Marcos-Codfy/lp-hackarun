import { isoDateIn } from './DayTabsController';

const DAY_MS = 86_400_000;

// o Intl com fuso custa ~10 ms no 1º uso (carrega os dados do fuso), uma tarefa longa no boot do celular.
// Só calcula perto dos dias da programação: longe deles nenhuma aba casa com hoje e o resultado é o
// mesmo (abre o 1º dia). Um dia de folga de cada lado cobre qualquer fuso (UTC-12 a UTC+14)
export function todayForSchedule(dates: readonly string[], now: Date, timeZone: string): string | null {
  const times = dates.map((date) => Date.parse(`${date}T00:00:00Z`)).filter(Number.isFinite);
  if (times.length === 0) return null;
  const at = now.getTime();
  if (at < Math.min(...times) - DAY_MS || at >= Math.max(...times) + 2 * DAY_MS) return null;
  return isoDateIn(timeZone, now);
}

// datas (AAAA-MM-DD) das abas de dia de cada programação na página
export function scheduleDates(roots: readonly HTMLElement[]): string[] {
  return roots.flatMap((root) =>
    Array.from(root.querySelectorAll<HTMLElement>('[data-day-tab]'), (tab) => tab.dataset['date'] ?? ''),
  );
}

// pedaços da 1ª tela do sorteio: números do topo, relatório de diversidade e o card de cada equipe
import { levelLabel, type DrawnTeam, type DrawReport } from '@domain/index';
import { h } from './dom';

export const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function stat(label: string, value: string): HTMLElement {
  return h(
    'div',
    { class: 'stat' },
    h('span', { class: 'stat__value' }, value),
    h('span', { class: 'stat__label' }, label),
  );
}

export function reportBox(report: DrawReport, seed: string): HTMLElement {
  const optimal = report.levelRepeatsTotal === report.levelRepeatsUnavoidable;
  const repeated = new Map<number, string[]>();
  for (const r of report.levelRepeats) {
    repeated.set(r.team, [...(repeated.get(r.team) ?? []), `${levelLabel(r.level)} ×${r.count}`]);
  }
  return h(
    'div',
    { class: 'report', 'data-optimal': String(optimal) },
    h(
      'p',
      { class: 'report__line' },
      h('strong', {}, 'Níveis: '),
      report.levelRepeatsTotal === 0
        ? 'nenhuma equipe tem dois integrantes do mesmo nível.'
        : `${plural(report.levelRepeatsTotal, 'repetição', 'repetições')} de nível. ` +
            (optimal
              ? `É o mínimo possível: ${report.crowdedLevels
                  .map((c) => `${levelLabel(c.level)} tem ${c.count} pessoas`)
                  .join(' e ')} para ${report.teams} equipes.`
              : `O mínimo possível seria ${report.levelRepeatsUnavoidable}: pode valer sortear de novo.`),
    ),
    h(
      'p',
      { class: 'report__line' },
      h('strong', {}, 'Outras instituições: '),
      report.externalTotal === 0
        ? 'ninguém de fora da UniCatólica.'
        : `${report.externalTotal} pessoas, de ${report.externalPerTeam.min} a ${report.externalPerTeam.max} por equipe` +
            (report.externalTotal > report.teams
              ? ` (há mais gente de fora do que equipes, então ao menos ${report.externalTotal - report.teams} ficam com 2)`
              : '') +
            (report.sameExternalInstitution > 0
              ? `; ${plural(report.sameExternalInstitution, 'par', 'pares')} da mesma instituição na mesma equipe.`
              : '; nenhuma equipe repete a instituição de fora.'),
    ),
    repeated.size > 0 &&
      h(
        'ul',
        { class: 'report__repeats' },
        ...[...repeated].map(([team, items]) => h('li', {}, `Equipe ${team}: ${items.join(', ')}`)),
      ),
    h('p', { class: 'report__seed' }, `Semente: ${seed}`),
  );
}

// card montado "fechado": os nomes aparecem como ??? e a revelação gira e trava no nome certo (data-name)
export function teamCard(team: DrawnTeam): HTMLElement {
  const counts = new Map<string, number>();
  for (const m of team.members) counts.set(m.level, (counts.get(m.level) ?? 0) + 1);
  return h(
    'article',
    { class: 'team team--waiting' },
    h(
      'header',
      { class: 'team__head' },
      h('h3', {}, `Equipe ${team.number}`),
      h('span', { class: 'team__count' }, `${team.members.length}`),
    ),
    h(
      'ul',
      { class: 'team__members' },
      ...team.members.map((m) =>
        h(
          'li',
          {},
          h('span', { class: 'member__name', 'data-name': m.name }, '???'),
          h(
            'span',
            { class: 'chips' },
            h(
              'span',
              { class: 'chip', 'data-repeat': String((counts.get(m.level) ?? 0) > 1) },
              levelLabel(m.level),
            ),
            m.institution.external && h('span', { class: 'chip chip--outside' }, m.institution.label),
          ),
        ),
      ),
    ),
  );
}

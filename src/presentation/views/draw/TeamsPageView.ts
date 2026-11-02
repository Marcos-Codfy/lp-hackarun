import { levelLabel, type DrawnTeam, type DrawReport } from '@domain/index';
import type { DrawServices } from '@composition/draw';
import type { DrawPreview } from '@application/draw/TeamDrawUseCases';
import { TeamDrawViewModel, type TeamDrawState } from '@presentation/view-models/draw/TeamDrawViewModel';
import { h, mustFind } from './dom';
import { confetti } from './fx/confetti';
import { countdown, type Countdown } from './fx/countdown';
import { setupStage } from './fx/stage';
import { prefersReducedMotion } from './fx/timing';
import { revealTeams, type TeamsReveal } from './TeamsReveal';

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

function stat(label: string, value: string): HTMLElement {
  return h(
    'div',
    { class: 'stat' },
    h('span', { class: 'stat__value' }, value),
    h('span', { class: 'stat__label' }, label),
  );
}

function reportBox(report: DrawReport, seed: string): HTMLElement {
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
              ? 'É o mínimo que a conta permite com as pessoas credenciadas.'
              : `O mínimo possível seria ${report.levelRepeatsUnavoidable}: pode valer sortear de novo.`),
    ),
    h(
      'p',
      { class: 'report__line' },
      h('strong', {}, 'Outras instituições: '),
      report.externalTotal === 0
        ? 'ninguém de fora da UniCatólica.'
        : `${report.externalTotal} pessoas, de ${report.externalPerTeam.min} a ${report.externalPerTeam.max} por equipe` +
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
function teamCard(team: DrawnTeam): HTMLElement {
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

// 1ª tela do sorteio: credenciados, sorteio das equipes com revelação em cascata, relatório e salvar na planilha
export function mountTeamsPage(services: DrawServices): TeamDrawViewModel {
  const vm = new TeamDrawViewModel({
    status: services.status,
    generate: services.generate,
    save: services.save,
  });
  const stats = mustFind('[data-stats]');
  const message = mustFind<HTMLElement>('[data-message]');
  const report = mustFind('[data-report]');
  const grid = mustFind('[data-grid]');
  const progress = mustFind<HTMLElement>('[data-progress]');
  const progressText = mustFind('[data-progress-text]', progress);
  const progressBar = mustFind<HTMLElement>('[data-progress-bar]', progress);
  const drawButton = mustFind<HTMLButtonElement>('[data-draw]');
  const saveButton = mustFind<HTMLButtonElement>('[data-save]');
  const skipButton = mustFind<HTMLButtonElement>('[data-skip]');
  const seedInput = mustFind<HTMLInputElement>('[data-seed]');
  const reduced = prefersReducedMotion();

  // o "show" em andamento (contagem e cascata); null = nada rodando
  let show: { countdown: Countdown | null; reveal: TeamsReveal | null } | null = null;
  let shownPreview: DrawPreview | null = null;

  const skip = () => {
    show?.countdown?.skip();
    show?.reveal?.skip();
  };

  const stage = setupStage({
    onPrimary: () => {
      if (!drawButton.disabled) drawButton.click();
    },
    onSkip: skip,
  });

  const setProgress = (revealed: number, total: number) => {
    progress.hidden = total === 0;
    progressText.textContent =
      revealed < total ? `Equipe ${revealed + 1} de ${total}` : `${total} equipes formadas`;
    progressBar.style.setProperty('--value', String(total ? revealed / total : 0));
  };

  const confirm = (teams: number, people: number, replacing: boolean): Promise<boolean> =>
    new Promise((resolve) => {
      const dialog = h(
        'dialog',
        { class: 'dialog' },
        h('h2', {}, 'Gravar na planilha?'),
        h(
          'p',
          { class: 'dialog__hint' },
          `${plural(teams, 'equipe', 'equipes')} para ${people} pessoas: a coluna Equipe da aba Inscritos e a aba Equipes serão preenchidas.` +
            (replacing ? ' Já existe um sorteio salvo, e este vai substituí-lo.' : ''),
        ),
        h(
          'div',
          { class: 'dialog__actions' },
          h('button', { class: 'btn', type: 'button', 'data-no': true }, 'Cancelar'),
          h('button', { class: 'btn btn--primary', type: 'button', 'data-yes': true }, 'Gravar'),
        ),
      );
      document.body.append(dialog);
      const done = (answer: boolean) => {
        dialog.close();
        dialog.remove();
        resolve(answer);
      };
      mustFind('[data-yes]', dialog).addEventListener('click', () => done(true));
      mustFind('[data-no]', dialog).addEventListener('click', () => done(false));
      dialog.addEventListener('cancel', () => done(false));
      dialog.showModal();
    });

  const render = (state: TeamDrawState) => {
    const busy =
      state.status === 'loading' || state.status === 'drawing' || state.status === 'saving' || show !== null;
    const preview = state.preview;
    stats.replaceChildren(
      stat('credenciados', state.sheet ? String(state.sheet.accredited) : '–'),
      stat('equipes', preview ? String(preview.result.report.teams) : '–'),
      stat(
        'salvo na planilha',
        state.sheet
          ? state.sheet.saved.length > 0
            ? `${state.sheet.saved.length} equipes`
            : 'ainda não'
          : '–',
      ),
    );

    drawButton.textContent =
      state.status === 'drawing' ? 'Sorteando…' : preview ? 'Sortear de novo' : 'Sortear equipes';
    drawButton.disabled = busy || (preview?.locked ?? false);
    saveButton.disabled = busy || !preview || state.saved || preview.locked;
    saveButton.textContent =
      state.status === 'saving' ? 'Gravando…' : state.saved ? 'Gravado ✓' : 'Salvar na planilha';
    skipButton.hidden = show === null;

    message.replaceChildren();
    message.dataset['kind'] = state.error ? 'error' : state.saved ? 'ok' : preview?.locked ? 'warn' : '';
    if (state.error) message.append(state.error);
    else if (state.saved) {
      message.append(
        'Equipes gravadas na planilha. ',
        h('a', { href: '/sorteio/nomes' }, 'Ir para o sorteio dos nomes →'),
      );
    } else if (preview?.locked) {
      message.append('Alguma equipe já tem nome: o sorteio das equipes está travado.');
    } else if (preview?.alreadySaved && show === null) {
      message.append('Já existe um sorteio salvo na planilha. Se gravar este, ele substitui o anterior.');
    }

    report.replaceChildren(
      ...(preview && show === null ? [reportBox(preview.result.report, preview.result.seed)] : []),
    );
    if (preview && preview !== shownPreview) void startShow(preview);
  };

  // o sorteio já foi feito (e nada foi gravado ainda): aqui é só a revelação na tela
  async function startShow(preview: DrawPreview): Promise<void> {
    shownPreview = preview;
    const { teams } = preview.result;
    show = { countdown: null, reveal: null };
    grid.replaceChildren();
    setProgress(0, teams.length);
    render(vm.state.value);

    const stopDrum = stage.sound.drumroll();
    show.countdown = countdown(stage.sound, reduced);
    await show.countdown.done;
    stopDrum();

    const cards = teams.map(teamCard);
    grid.replaceChildren(...cards);
    const names = teams.flatMap((t) => t.members.map((m) => m.name));
    show.reveal = revealTeams(cards, { names, reduced, sound: stage.sound, onProgress: setProgress });
    await show.reveal.done;

    show = null;
    stage.sound.fanfare();
    confetti(reduced);
    render(vm.state.value);
  }

  vm.state.subscribe(render);
  drawButton.addEventListener('click', () => void vm.draw(seedInput.value));
  skipButton.addEventListener('click', skip);
  saveButton.addEventListener('click', async () => {
    const preview = vm.state.value.preview;
    if (!preview) return;
    const { report: r } = preview.result;
    if (await confirm(r.teams, r.participants, preview.alreadySaved)) await vm.save();
  });
  void vm.load();
  return vm;
}

import { qs } from '@shared/utils/dom';
import type { PublicTeam, TeamsState, TeamsViewModel } from '@presentation/view-models/teams/TeamsViewModel';

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

// [data-teams]: busca, lista via <template>, estado vazio e contador anunciado com calma
export class TeamsView {
  private readonly root: HTMLElement;
  private readonly vm: TeamsViewModel;
  private readonly list: HTMLElement | null;
  private readonly template: HTMLTemplateElement | null;
  private announceTimer: ReturnType<typeof setTimeout> | null = null;
  private renderedTeams: PublicTeam[] | null = null;

  constructor(root: HTMLElement, vm: TeamsViewModel) {
    this.root = root;
    this.vm = vm;
    this.list = qs('[data-teams-list]', root);
    this.template = qs<HTMLTemplateElement>('template[data-teams-template]', root);
  }

  mount(): void {
    const input = qs<HTMLInputElement>('[data-teams-search]', this.root);
    input?.addEventListener('input', () => this.vm.setQuery(input.value));
    // o SSR já desenhou a lista inicial: não refaz à toa
    this.renderedTeams = this.vm.state.value.visible;
    this.vm.state.subscribe((state, prev) => this.render(state, prev));
    if (this.vm.isLive) this.refreshWhenVisible();
  }

  private render(state: TeamsState, prev: TeamsState): void {
    const hasTeams = state.teams.length > 0;
    this.toggle('[data-teams-search-wrap]', hasTeams);
    this.toggle('[data-teams-empty]', !hasTeams);
    // lista vazia some: leitor de tela não precisa ouvir "lista, 0 itens"
    this.toggle('[data-teams-list]', state.visible.length > 0);
    this.toggle('[data-teams-noresults]', hasTeams && state.visible.length === 0);
    this.setText('[data-teams-query]', state.query.trim());
    this.setText('[data-teams-count]', String(state.teams.length));
    this.setText(
      '[data-teams-count-label]',
      plural(state.teams.length, 'equipe confirmada', 'equipes confirmadas'),
    );
    this.toggle('[data-teams-slots-text]', state.slots.remaining !== null);
    this.setText('[data-teams-remaining]', String(state.slots.remaining ?? ''));
    this.root.dataset['slotsLevel'] = state.slots.level;
    this.list?.setAttribute('aria-busy', String(state.status === 'loading'));
    if (state.visible !== this.renderedTeams) this.renderList(state.visible);
    if (state.query !== prev.query) this.announce(state);
  }

  // lista pequena: refaz tudo, sem diff; textContent evita injeção vinda da planilha
  private renderList(teams: PublicTeam[]): void {
    this.renderedTeams = teams;
    if (!this.list || !this.template) return;
    const fragment = document.createDocumentFragment();
    teams.forEach((team, i) => {
      const card = this.template?.content.firstElementChild?.cloneNode(true);
      if (!(card instanceof HTMLElement)) return;
      this.fill(card, team, i + 1);
      fragment.append(card);
    });
    this.list.replaceChildren(fragment);
  }

  private fill(card: HTMLElement, team: PublicTeam, rank: number): void {
    const set = (sel: string, text: string) => {
      const el = qs(sel, card);
      if (el) el.textContent = text;
    };
    set('[data-team-rank]', `#${String(rank).padStart(2, '0')}`);
    set('[data-team-name]', team.name);
    set('[data-team-course]', team.course ?? '');
    qs('[data-team-course]', card)?.toggleAttribute('hidden', !team.course);
    set('[data-team-count]', `${team.memberCount} ${plural(team.memberCount, 'integrante', 'integrantes')}`);
    qs('[data-team-pips]', card)?.style.setProperty('--count', String(team.memberCount));
  }

  // espera a pessoa parar de digitar pra anunciar o resultado
  private announce(state: TeamsState): void {
    if (this.announceTimer) clearTimeout(this.announceTimer);
    this.announceTimer = setTimeout(() => {
      const n = state.visible.length;
      const text = state.query.trim()
        ? `${n} ${plural(n, 'equipe encontrada', 'equipes encontradas')}`
        : `${state.teams.length} ${plural(state.teams.length, 'equipe confirmada', 'equipes confirmadas')}`;
      this.setText('[data-teams-live]', text);
    }, 450);
  }

  // só busca na planilha quando a seção chega perto da tela (e de novo se voltar depois de 1 min)
  private refreshWhenVisible(): void {
    if (!('IntersectionObserver' in window)) {
      void this.vm.refresh();
      return;
    }
    new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) void this.vm.refreshIfStale();
      },
      { rootMargin: '400px 0px' },
    ).observe(this.root);
  }

  private toggle(selector: string, visible: boolean): void {
    const el = qs(selector, this.root);
    if (el) el.hidden = !visible;
  }

  private setText(selector: string, text: string): void {
    const el = qs(selector, this.root);
    if (el && el.textContent !== text) el.textContent = text;
  }
}

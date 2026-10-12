// smoke: as Views montam no DOM e reagem ao básico (o resto é coberto nos VMs)
import { beforeEach, describe, expect, it } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import { NpcHuntViewModel } from '@presentation/view-models/npc/NpcHuntViewModel';
import { TeamsViewModel } from '@presentation/view-models/teams/TeamsViewModel';
import { NpcTokenView } from '@presentation/views/NpcTokenView';
import { TeamsView } from '@presentation/views/TeamsView';

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('views (smoke)', () => {
  it('NpcTokenView marca o token como achado sem tirar o foco', () => {
    document.body.innerHTML = '<button data-npc-token="npc-1" data-npc-label="NPC escondido">?</button>';
    const button = document.querySelector('button') as HTMLButtonElement;
    const vm = new NpcHuntViewModel({ store: new MemoryPreferenceStore(), bus: new EventBus<AppEvents>() });
    new NpcTokenView(button, vm).mount();
    button.click();
    expect(vm.isFound('npc-1')).toBe(true);
    expect(button.classList.contains('is-found')).toBe(true);
    expect(button.getAttribute('aria-disabled')).toBe('true');
    expect(button.disabled).toBe(false);
  });

  it('TeamsView mostra o estado vazio e a busca só quando tem equipe', () => {
    document.body.innerHTML = `
      <div data-teams>
        <div data-teams-search-wrap hidden><input data-teams-search /></div>
        <span data-teams-count></span><span data-teams-count-label></span>
        <ol data-teams-list></ol>
        <p data-teams-noresults hidden><span data-teams-query></span></p>
        <div data-teams-empty></div>
        <p data-teams-live></p>
        <template data-teams-template><li><p data-team-name></p>
          <p data-team-course></p><span data-team-pips></span><span data-team-count></span></li></template>
      </div>`;
    const root = document.querySelector('[data-teams]') as HTMLElement;
    const vm = new TeamsViewModel({
      initial: [],
      slots: { capacity: null, taken: 0, remaining: null, level: 'unknown' },
      listTeams: null,
    });
    new TeamsView(root, vm).mount();
    expect((root.querySelector('[data-teams-empty]') as HTMLElement).hidden).toBe(false);
    expect((root.querySelector('[data-teams-search-wrap]') as HTMLElement).hidden).toBe(true);
    expect(root.querySelector('[data-teams-count-label]')?.textContent).toBe('equipes confirmadas');
  });
});

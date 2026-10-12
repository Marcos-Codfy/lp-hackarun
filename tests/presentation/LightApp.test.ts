// boot das páginas leves (/equipes): header, "Pausar animações" e equipes ao vivo a partir do #app-config
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import type { AppConfig } from '@presentation/app/AppConfig';
import type { PublicTeam } from '@presentation/view-models/teams/TeamsViewModel';

const container = vi.hoisted(() => ({ create: vi.fn() }));
vi.mock('@composition/client', () => ({ createClientContainer: container.create }));

const SLOTS = { capacity: null, taken: 0, remaining: null, level: 'unknown' };
const CONFIG = { milestones: [], registration: { slots: SLOTS }, teamsEndpoint: null };
const TEAMS: PublicTeam[] = [
  { id: 'a', name: 'Bug Busters', memberCount: 3, imageUrl: null },
  { id: 'b', name: 'Cerrado Devs', memberCount: 4, imageUrl: null },
];

const page = (config: unknown = CONFIG) => `
  <header data-site-header></header>
  <button data-motion-toggle aria-pressed="false" hidden><span>Pausar animações</span></button>
  <div data-teams data-teams-initial='${JSON.stringify(TEAMS)}'>
    <ol data-teams-faces hidden></ol><span data-teams-more hidden></span>
    <template data-teams-face-template>
      <li data-team-card><span data-team-frame><span data-team-initials></span></span></li>
    </template>
  </div>
  ${config === null ? '' : `<script id="app-config" type="application/json">${JSON.stringify(config)}</script>`}`;

// LightApp.booted é estático: cada teste carrega o módulo de novo
async function boot(html: string) {
  document.body.innerHTML = html;
  vi.resetModules();
  const { LightApp } = await import('@presentation/app/LightApp');
  LightApp.boot();
}

describe('LightApp.boot', () => {
  let error: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    container.create.mockReset();
    container.create.mockReturnValue({ preferences: new MemoryPreferenceStore(), listTeams: null });
    error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => error.mockRestore());

  it('liga "Pausar animações" e a vitrine de equipes com o config da página', async () => {
    await boot(page());
    const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]') as HTMLButtonElement;
    await vi.waitFor(() =>
      expect(document.querySelectorAll('[data-teams-faces] [data-team-card]')).toHaveLength(2),
    );
    expect(toggle.hidden).toBe(false);
    const config = container.create.mock.calls[0]?.[0] as AppConfig;
    expect(config.registration.slots).toEqual(SLOTS);
    expect(document.querySelector('[data-teams-faces] [data-team-initials]')?.textContent).toBe('BB');
  });

  it('sem #app-config avisa no console e não monta nada', async () => {
    await boot(page(null));
    await vi.waitFor(() => expect(error).toHaveBeenCalledWith('[light-app] missing #app-config'));
    expect(container.create).not.toHaveBeenCalled();
    expect(document.querySelector<HTMLButtonElement>('[data-motion-toggle]')?.hidden).toBe(true);
  });
});

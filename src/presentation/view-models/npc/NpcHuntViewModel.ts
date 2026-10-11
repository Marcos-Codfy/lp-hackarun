import { Observable } from '@shared/core/Observable';
import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { PreferenceStore } from '@application/ports/PreferenceStore';

export interface NpcHuntState {
  found: string[];
  total: number;
  allFound: boolean;
}

export const NPC_SECRET = 'Você achou todos os NPCs. Sua pista: a largada é no lançamento, dia 12.';

const KEY = 'npc-found';

// caça aos NPCs: achados ficam salvos no navegador e avisam o resto do app pelo bus
export class NpcHuntViewModel {
  readonly state: Observable<NpcHuntState>;
  private readonly store: PreferenceStore;
  private readonly bus: EventBus<AppEvents>;
  private readonly total: number;

  constructor(deps: { store: PreferenceStore; bus: EventBus<AppEvents>; total?: number }) {
    this.store = deps.store;
    this.bus = deps.bus;
    this.total = deps.total ?? 3;
    const found = this.restore();
    this.state = new Observable<NpcHuntState>(this.snapshot(found));
  }

  isFound(id: string): boolean {
    return this.state.value.found.includes(id);
  }

  // true só na primeira vez que acha aquele NPC
  markFound(id: string): boolean {
    if (!id || this.isFound(id) || this.state.value.allFound) return false;
    const found = [...this.state.value.found, id];
    this.store.set(KEY, JSON.stringify(found));
    this.state.set(this.snapshot(found));
    this.bus.emit('npc:found', { id, found: found.length, total: this.total });
    return true;
  }

  private snapshot(found: string[]): NpcHuntState {
    return { found, total: this.total, allFound: found.length >= this.total };
  }

  // storage pode vir com lixo (edição manual, versão antiga): filtra tudo
  private restore(): string[] {
    try {
      const raw: unknown = JSON.parse(this.store.get(KEY) ?? '[]');
      if (!Array.isArray(raw)) return [];
      const ids = raw.filter((v): v is string => typeof v === 'string' && v.length > 0);
      return [...new Set(ids)].slice(0, this.total);
    } catch {
      return [];
    }
  }
}

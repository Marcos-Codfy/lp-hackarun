import { Observable } from '@shared/core/Observable';
import type { EventBus } from '@shared/core/EventBus';
import type { PreferenceStore } from '@application/ports/PreferenceStore';
import type { AppEvents } from '@presentation/app/AppEvents';

export interface MotionPreferenceDeps {
  store: PreferenceStore;
  bus: EventBus<AppEvents>;
  // prefers-reduced-motion: o sistema já parou tudo, o botão só mostra isso
  reducedMotion: boolean;
}

const KEY = 'motion';
const PAUSED = 'paused';
const RUNNING = 'running';

// WCAG 2.2.2: pausa o que se mexe sozinho (3D, raios, loops em CSS). Começa rodando; a escolha fica salva
export class MotionPreferenceViewModel {
  readonly paused: Observable<boolean>;
  // reduced motion trava em "pausado" e não grava nada (a preferência do sistema manda)
  readonly locked: boolean;
  private readonly deps: MotionPreferenceDeps;

  constructor(deps: MotionPreferenceDeps) {
    this.deps = deps;
    this.locked = deps.reducedMotion;
    this.paused = new Observable(this.locked || deps.store.get(KEY) === PAUSED);
  }

  // texto do tooltip: a ação que o clique faz (o nome acessível é fixo, o estado vai no aria-pressed)
  hint(paused: boolean): string {
    if (this.locked) return 'Animações reduzidas pelo sistema';
    return paused ? 'Retomar animações' : 'Pausar animações';
  }

  toggle(): void {
    this.setPaused(!this.paused.value);
  }

  setPaused(paused: boolean): void {
    if (this.locked) return;
    this.deps.store.set(KEY, paused ? PAUSED : RUNNING);
    if (this.paused.value === paused) return;
    this.paused.set(paused);
    this.deps.bus.emit('motion:paused', { paused });
  }
}

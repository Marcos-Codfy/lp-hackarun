import { Observable } from '@shared/core/Observable';
import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { PreferenceStore } from '@application/ports/PreferenceStore';
import type { AudioCue } from '@application/ports/AudioCue';
import type { TickSound } from '@application/ports/TickSound';

// o que o VM precisa do AudioEngine (facilita o teste)
export interface AudioUnlocker {
  readonly isSupported: boolean;
  unlock(): Promise<boolean>;
  suspend(): void;
}

export interface SoundDeps {
  store: PreferenceStore;
  engine: AudioUnlocker;
  cue: AudioCue;
  bus: EventBus<AppEvents>;
  // cliques de digitação (opcional: sem ele, playTyping não faz nada)
  typing?: TickSound;
}

const KEY = 'sound';

// som começa desligado (autoplay + WCAG 1.4.2); só liga com clique do usuário
export class SoundViewModel {
  readonly enabled: Observable<boolean>;
  private readonly deps: SoundDeps;

  constructor(deps: SoundDeps) {
    this.deps = deps;
    this.enabled = new Observable(deps.engine.isSupported && deps.store.get(KEY) === 'on');
  }

  get isSupported(): boolean {
    return this.deps.engine.isSupported;
  }

  // chamado direto do handler de clique: o unlock precisa do gesto
  toggle(): void {
    this.setEnabled(!this.enabled.value);
  }

  setEnabled(on: boolean): void {
    if (on && !this.isSupported) return;
    if (on) this.unlock();
    else this.deps.engine.suspend();
    this.deps.store.set(KEY, on ? 'on' : 'off');
    if (this.enabled.value === on) return;
    this.enabled.set(on);
    this.deps.bus.emit('sound:changed', { enabled: on });
  }

  // preferência salva como "ligado": destrava no primeiro toque/tecla da visita
  resumeFromGesture(): void {
    if (this.enabled.value) this.unlock();
  }

  playCue(): void {
    if (!this.enabled.value) return;
    this.deps.cue.play().catch(() => undefined);
  }

  playTyping(): void {
    if (this.enabled.value) this.deps.typing?.play();
  }

  private unlock(): void {
    this.deps.engine
      .unlock()
      .then((ok) => {
        if (!ok) return;
        this.deps.cue.preload?.();
        this.deps.typing?.preload?.();
      })
      .catch(() => undefined);
  }
}

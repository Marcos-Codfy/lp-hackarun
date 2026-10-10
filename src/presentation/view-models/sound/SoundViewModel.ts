import { Observable } from '@shared/core/Observable';
import type { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import type { PreferenceStore } from '@infrastructure/storage/PreferenceStore';
import type { AudioCue } from '@infrastructure/audio/AudioCue';

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

  private unlock(): void {
    this.deps.engine
      .unlock()
      .then((ok) => {
        if (ok) this.deps.cue.preload?.();
      })
      .catch(() => undefined);
  }
}

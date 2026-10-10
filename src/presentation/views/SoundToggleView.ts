import { qs } from '@shared/utils/dom';
import type { SoundViewModel } from '@presentation/view-models/sound/SoundViewModel';

// [data-sound-toggle]: nome acessível "Som ligado/desligado" + aria-pressed
export class SoundToggleView {
  private readonly button: HTMLButtonElement;
  private readonly vm: SoundViewModel;

  constructor(button: HTMLButtonElement, vm: SoundViewModel) {
    this.button = button;
    this.vm = vm;
  }

  mount(): void {
    // sem Web Audio o botão nem aparece (começa hidden no HTML, então sem JS também some)
    if (!this.vm.isSupported) return;
    this.button.hidden = false;
    const state = qs('[data-sound-state]', this.button);
    this.button.addEventListener('click', () => this.vm.toggle());
    this.vm.enabled.subscribe((on) => {
      this.button.setAttribute('aria-pressed', String(on));
      if (state) state.textContent = on ? 'ligado' : 'desligado';
    });
  }

  // preferência salva "ligado": o navegador só libera o áudio depois de um gesto
  static unlockOnFirstGesture(vm: SoundViewModel): void {
    const events = ['pointerdown', 'keydown'] as const;
    const handler = () => {
      events.forEach((e) => window.removeEventListener(e, handler, true));
      vm.resumeFromGesture();
    };
    events.forEach((e) => window.addEventListener(e, handler, { capture: true, passive: true }));
  }
}

// "palco" das telas do sorteio: modo apresentação (tela cheia, só o show; tecla F), botão de som e os atalhos
// (Espaço = sortear, S = revelar tudo). Os atalhos não disparam enquanto alguém digita num campo ou com um diálogo aberto
import { mustFind } from '../dom';
import { DrawSound } from './sound';

export interface StageActions {
  onPrimary(): void;
  onSkip(): void;
}

export interface Stage {
  sound: DrawSound;
}

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

export function setupStage(actions: StageActions): Stage {
  const sound = new DrawSound();
  const presentButton = mustFind<HTMLButtonElement>('[data-present]');
  const soundButton = mustFind<HTMLButtonElement>('[data-sound]');

  const paintSound = () => {
    soundButton.textContent = sound.enabled ? 'Som: ligado' : 'Som: desligado';
    soundButton.setAttribute('aria-pressed', String(sound.enabled));
  };
  paintSound();
  soundButton.addEventListener('click', () => {
    sound.toggle();
    paintSound();
  });

  const setPresenting = (on: boolean) => {
    document.body.classList.toggle('presenting', on);
    presentButton.setAttribute('aria-pressed', String(on));
    presentButton.textContent = on ? 'Sair da apresentação' : 'Modo apresentação';
  };
  const togglePresenting = () => {
    const on = !document.body.classList.contains('presenting');
    setPresenting(on);
    if (on && !document.fullscreenElement)
      void document.documentElement.requestFullscreen?.().catch(() => undefined);
    if (!on && document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
  };
  presentButton.addEventListener('click', togglePresenting);
  // Esc do navegador saiu da tela cheia: sai do modo apresentação junto
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement) setPresenting(false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey || typing(event.target)) return;
    if (document.querySelector('dialog[open]')) return;
    const key = event.key.toLowerCase();
    if (key === ' ') {
      event.preventDefault();
      actions.onPrimary();
    } else if (key === 's') {
      actions.onSkip();
    } else if (key === 'f') {
      togglePresenting();
    }
  });

  return { sound };
}

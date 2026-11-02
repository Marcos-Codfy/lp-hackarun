// "palco" das telas do sorteio: modo apresentação (tela cheia, só o show; tecla F) e a altura do menu do topo, que a
// tela desconta ao rolar até o card revelado (sem isso o menu fixo cobre a linha que está aparecendo)
import { mustFind } from '../dom';

function typing(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);
}

function trackTopHeight(): void {
  const top = mustFind<HTMLElement>('.top');
  const apply = () => document.documentElement.style.setProperty('--top-h', `${top.offsetHeight}px`);
  apply();
  new ResizeObserver(apply).observe(top);
}

export function setupStage(): void {
  trackTopHeight();
  const presentButton = mustFind<HTMLButtonElement>('[data-present]');

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
    if (event.key.toLowerCase() === 'f') togglePresenting();
  });
}

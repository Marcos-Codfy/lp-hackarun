// fim do sorteio: um carimbo "Sorteio finalizado" em tela cheia por alguns segundos (some sozinho ou com um clique)
const SHOW_MS = 2600;

export function finale(title: string, detail: string, reducedMotion: boolean): void {
  document.querySelector('.finale')?.remove();
  const overlay = document.createElement('div');
  overlay.className = 'finale';
  overlay.setAttribute('role', 'status');
  const kicker = document.createElement('span');
  kicker.className = 'finale__kicker';
  kicker.textContent = 'Sorteio finalizado';
  const heading = document.createElement('strong');
  heading.className = 'finale__title';
  heading.textContent = title;
  const sub = document.createElement('span');
  sub.className = 'finale__detail';
  sub.textContent = detail;
  overlay.append(kicker, heading, sub);
  document.body.append(overlay);
  const close = () => overlay.remove();
  overlay.addEventListener('click', close);
  window.setTimeout(close, reducedMotion ? SHOW_MS / 2 : SHOW_MS);
}

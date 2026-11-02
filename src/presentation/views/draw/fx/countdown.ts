// contagem 3, 2, 1 em tela cheia antes do sorteio. Resolve no fim ou quando alguém pula ("Revelar tudo")

const STEP_MS = 650;

export interface Countdown {
  done: Promise<void>;
  skip(): void;
}

export function countdown(reducedMotion: boolean): Countdown {
  if (reducedMotion) return { done: Promise.resolve(), skip: () => undefined };
  const overlay = document.createElement('div');
  overlay.className = 'countdown';
  overlay.setAttribute('aria-hidden', 'true');
  const number = document.createElement('span');
  overlay.append(number);
  document.body.append(overlay);

  let finish: () => void = () => undefined;
  const done = new Promise<void>((resolve) => (finish = resolve));
  const timers: number[] = [];
  const end = () => {
    timers.forEach((t) => window.clearTimeout(t));
    overlay.remove();
    finish();
  };
  ['3', '2', '1'].forEach((value, i) => {
    timers.push(
      window.setTimeout(() => {
        number.textContent = value;
        // reinicia a animação do número
        number.classList.remove('countdown__pop');
        void number.offsetWidth;
        number.classList.add('countdown__pop');
      }, i * STEP_MS),
    );
  });
  timers.push(window.setTimeout(end, 3 * STEP_MS));
  return { done, skip: end };
}

// digitou e foi direto num botão do formulário ("Confirmar inscrição", "Adicionar integrante"): o blur valida o
// campo, o erro aparece acima e empurra o botão entre o apertar e o soltar, e o clique se perde. Enquanto o
// dedo ou o mouse estão num botão, a validação do blur espera o clique acontecer (o envio valida tudo mesmo)
const PRESS = 'button, a[href], [role="button"]';
// apertou e arrastou pra fora (sem clique): a validação roda mesmo assim
const RELEASE_MS = 1000;

export class PressGuard {
  private pressing = false;
  private timer = 0;
  private readonly queue: (() => void)[] = [];

  constructor(root: HTMLElement) {
    root.addEventListener(
      'pointerdown',
      (event) => {
        if (event.target instanceof Element && event.target.closest(PRESS)) this.hold();
      },
      { capture: true, passive: true },
    );
    root.addEventListener('click', () => this.release(), true);
    root.addEventListener('pointercancel', () => this.release(), true);
  }

  // roda agora ou, com um botão apertado, logo depois do clique
  run(fn: () => void): void {
    if (this.pressing) this.queue.push(fn);
    else fn();
  }

  private hold(): void {
    this.pressing = true;
    window.clearTimeout(this.timer);
    this.timer = window.setTimeout(() => this.release(), RELEASE_MS);
  }

  private release(): void {
    if (!this.pressing) return;
    this.pressing = false;
    window.clearTimeout(this.timer);
    const pending = this.queue.splice(0);
    // depois dos handlers do próprio clique (o envio já começou e valida tudo)
    if (pending.length) window.setTimeout(() => pending.forEach((fn) => fn()), 0);
  }
}

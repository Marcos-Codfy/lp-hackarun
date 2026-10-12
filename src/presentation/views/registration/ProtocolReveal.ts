import { prefersReducedMotion } from '@shared/utils/env';

const STEP_MS = 60;
const GLYPHS = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';

// quadro n da decodificação: n caracteres certos + 1 "embaralhado" na ponta (puro, fácil de testar)
export function revealFrame(text: string, step: number, glyph: string): string {
  const head = text.slice(0, Math.max(0, step));
  return step < text.length ? head + glyph : head;
}

// protocolo da inscrição aparece "decodificando", um caractere por passo
export class ProtocolReveal {
  private readonly el: HTMLElement;
  private readonly reduced: boolean;
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor(el: HTMLElement, reduced = prefersReducedMotion()) {
    this.el = el;
    this.reduced = reduced;
  }

  play(text: string): void {
    this.stop();
    if (this.reduced || text.length === 0) {
      this.el.textContent = text;
      return;
    }
    let step = 0;
    this.el.textContent = revealFrame(text, 0, this.glyph());
    this.timer = setInterval(() => {
      step += 1;
      this.el.textContent = revealFrame(text, step, this.glyph());
      if (step >= text.length) this.stop();
    }, STEP_MS);
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private glyph(): string {
    return GLYPHS[Math.floor(Math.random() * GLYPHS.length)] ?? '#';
  }
}

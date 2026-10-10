const READY_CLASS = 'is-experience-ready';

// estado visível do palco: classe no <html> pro crossfade do CSS + avisos de pronto/falha (uma vez cada)
export class StageStatus {
  ready = false;
  failed = false;
  private onReady: (() => void) | null = null;
  private onFail: ((reason: string) => void) | null = null;

  listen(onReady: () => void, onFail: (reason: string) => void): void {
    this.onReady = onReady;
    this.onFail = onFail;
  }

  markReady(): void {
    if (this.ready || this.failed) return;
    this.ready = true;
    document.documentElement.classList.add(READY_CLASS);
    const callback = this.onReady;
    this.onReady = null;
    callback?.();
  }

  // contexto perdido: o brilho em CSS volta até o próximo frame bom
  hide(): void {
    this.ready = false;
    document.documentElement.classList.remove(READY_CLASS);
  }

  fail(reason: string): void {
    if (this.failed) return;
    this.failed = true;
    this.hide();
    const callback = this.onFail;
    this.onFail = null;
    callback?.(reason);
  }
}

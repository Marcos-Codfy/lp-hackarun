// limitador de taxa: deixa passar no máximo um disparo a cada intervalMs (relógio injetado por quem chama)
export class MinIntervalGate {
  private readonly intervalMs: number;
  private last = Number.NEGATIVE_INFINITY;

  constructor(intervalMs: number) {
    this.intervalMs = intervalMs;
  }

  tryPass(nowMs: number): boolean {
    if (nowMs - this.last < this.intervalMs) return false;
    this.last = nowMs;
    return true;
  }
}

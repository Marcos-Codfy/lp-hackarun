import type { MotionHandle } from '@presentation/app/AppContext';

// trava o scroll da página (lenis + nativo) enquanto um overlay está aberto
export class ScrollLock {
  private readonly motion: MotionHandle;
  private locked = false;
  private previousOverflow = '';

  constructor(motion: MotionHandle) {
    this.motion = motion;
  }

  lock(): void {
    if (this.locked) return;
    this.locked = true;
    const root = document.documentElement;
    this.previousOverflow = root.style.overflow;
    root.style.overflow = 'hidden';
    this.motion.stop();
  }

  unlock(): void {
    if (!this.locked) return;
    this.locked = false;
    document.documentElement.style.overflow = this.previousOverflow;
    this.motion.start();
  }
}

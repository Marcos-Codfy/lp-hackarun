export const MOTION_PAUSED_CLASS = 'is-motion-paused';

// a classe no <html> é a fonte da verdade do "pausado": o CSS lê direto; 3D e raios (que montam depois,
// fora do MVVM) leem por aqui e já nascem no estado certo
export class MotionPauseSignal {
  constructor(private readonly root: HTMLElement = document.documentElement) {}

  isPaused(): boolean {
    return this.root.classList.contains(MOTION_PAUSED_CLASS);
  }

  set(paused: boolean): void {
    this.root.classList.toggle(MOTION_PAUSED_CLASS, paused);
  }

  // avisa só quando o estado muda (o <html> troca de classe por outros motivos: lenis, 3D pronto...)
  watch(onChange: (paused: boolean) => void): () => void {
    let last = this.isPaused();
    const observer = new MutationObserver(() => {
      const next = this.isPaused();
      if (next === last) return;
      last = next;
      onChange(next);
    });
    observer.observe(this.root, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }
}

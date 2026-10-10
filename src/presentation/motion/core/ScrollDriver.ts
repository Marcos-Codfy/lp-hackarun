import type { MotionHandle } from '@presentation/app/AppContext';

export interface ScrollRequest {
  offset?: number;
  immediate?: boolean;
  onComplete?: () => void;
}

// contrato comum do smooth (Lenis) e do nativo (reduced motion): Strategy
export interface ScrollDriver extends MotionHandle {
  scrollTo(target: string | HTMLElement, options?: ScrollRequest): void;
  destroy(): void;
}

export function resolveTarget(target: string | HTMLElement): HTMLElement | null {
  if (typeof target !== 'string') return target;
  // "#id" com caractere que o querySelector não aceita (ex.: "#1a") cai aqui
  if (target.startsWith('#')) return document.getElementById(decodeURIComponent(target.slice(1)));
  try {
    return document.querySelector<HTMLElement>(target);
  } catch {
    return null;
  }
}

function toPx(raw: string): number {
  const value = Number.parseFloat(raw);
  if (Number.isNaN(value)) return 0;
  if (raw.trim().endsWith('rem')) {
    return value * Number.parseFloat(getComputedStyle(document.documentElement).fontSize);
  }
  return value;
}

// folga do header fixo: usa o scroll-padding do html (header + respiro) ou cai pro --header-h
export function headerGap(): number {
  const style = getComputedStyle(document.documentElement);
  const padding = toPx(style.scrollPaddingTop);
  if (padding > 0) return padding;
  return toPx(style.getPropertyValue('--header-h')) || 64;
}

// y absoluto do alvo já descontando o header (offset do caller substitui a folga padrão)
export function targetY(el: HTMLElement, currentScroll: number, offset?: number): number {
  const gap = offset ?? -headerGap();
  return Math.max(0, el.getBoundingClientRect().top + currentScroll + gap);
}

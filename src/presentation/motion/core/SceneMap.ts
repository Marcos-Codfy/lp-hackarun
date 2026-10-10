// faixa (em px do documento, medida pelo centro da viewport) onde a seção está "no centro"
export interface SceneSpan {
  start: number;
  end: number;
}

// seção curta: o platô é só o centro dela; seção alta (ou pinada): segura o índice enquanto cobre a tela
export function spanOf(top: number, height: number, viewport: number): SceneSpan {
  const half = Math.min(height, viewport) / 2;
  return { start: top + half, end: top + height - half };
}

// índice contínuo: i no platô da seção i, i + 0.5 no meio do caminho até a próxima
export function progressAt(spans: readonly SceneSpan[], center: number): number {
  const first = spans[0];
  if (!first || center <= first.end) return 0;

  for (let i = 1; i < spans.length; i++) {
    const span = spans[i];
    const prev = spans[i - 1];
    if (!span || !prev || center > span.end) continue;
    if (center >= span.start) return i;
    const gap = span.start - prev.end;
    // seções sobrepostas (pin/margem negativa) não podem dividir por zero
    return gap <= 1 ? i : i - 1 + (center - prev.end) / gap;
  }

  return spans.length - 1;
}

// pinado pelo ScrollTrigger: quem ocupa o espaço no fluxo é o pin-spacer
export function layoutBoxOf(section: HTMLElement): HTMLElement {
  const parent = section.parentElement;
  return parent?.classList.contains('pin-spacer') ? parent : section;
}

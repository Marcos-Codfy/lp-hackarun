import type { ScrollDriver } from './ScrollDriver';

// só o que daqui usa do ScrollTrigger (o teste passa um dublê)
export interface RefreshEvents {
  addEventListener(type: 'refresh', listener: () => void): void;
  removeEventListener(type: 'refresh', listener: () => void): void;
}

export interface HashLandingOptions {
  hash?: string;
  // 'navigate' (link, endereço digitado), 'reload' ou 'back_forward'
  navigation?: string;
  ms?: number;
}

const WATCH_MS = 3000;
const USER_INPUT = ['wheel', 'touchstart', 'keydown', 'pointerdown'] as const;

function navigationType(): string {
  try {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    return entry?.type ?? 'navigate';
  } catch {
    return 'navigate';
  }
}

function hashTarget(hash: string): HTMLElement | null {
  if (hash.length < 2) return null;
  try {
    return document.getElementById(decodeURIComponent(hash.slice(1)));
  } catch {
    return null;
  }
}

// chegada de outra página com âncora (/#inscricao): o navegador pula pro alvo antes de o pin das missões
// existir, e o espaço que o pin abre empurra tudo que vem depois. Realinha no alvo a cada refresh do
// ScrollTrigger (pin, fontes, seção adiada montando) até a pessoa mexer na página ou passar ~3 s.
// Recarregar e voltar no histórico ficam com o navegador, que devolve a pessoa onde ela estava
export function landOnHash(
  driver: ScrollDriver,
  refreshes: RefreshEvents,
  options: HashLandingOptions = {},
): () => void {
  const { hash = location.hash, navigation = navigationType(), ms = WATCH_MS } = options;
  const target = navigation === 'navigate' ? hashTarget(hash) : null;
  if (!target) return () => undefined;

  const align = (): void => driver.scrollTo(target, { immediate: true });
  let timer = 0;
  const stop = (): void => {
    window.clearTimeout(timer);
    refreshes.removeEventListener('refresh', align);
    USER_INPUT.forEach((type) => window.removeEventListener(type, stop, true));
  };
  refreshes.addEventListener('refresh', align);
  USER_INPUT.forEach((type) => window.addEventListener(type, stop, { capture: true, passive: true }));
  timer = window.setTimeout(stop, ms);
  // o refresh do pin pode ter rodado antes deste passo do boot: confere já uma vez
  align();
  return stop;
}

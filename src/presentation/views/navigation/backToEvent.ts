// "← Voltar ao evento" das páginas leves: quem veio da LP nesta aba volta no histórico (o navegador devolve a
// pessoa no mesmo ponto da página, pelo bfcache ou pela restauração do scroll); quem chegou direto vai pro
// fim da LP (/#inscricao). Sem JS o link já é o /#inscricao
export type BackPlan = { kind: 'traverse'; key: string } | { kind: 'back' } | { kind: 'navigate' };

// o que importa da Navigation API (Chromium): as entradas desta aba, na mesma origem
export interface HistoryEntryLike {
  key: string;
  url: string | null;
  index: number;
}

export interface BackContext {
  referrer: string;
  origin: string;
  historyLength: number;
  // Navigation API, quando existe: acha a LP mesmo duas páginas atrás (LP > inscrição > equipes)
  entries?: readonly HistoryEntryLike[];
  currentIndex?: number;
}

const LANDING_PATH = '/';

function isLanding(url: string | null, origin: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    return parsed.origin === origin && parsed.pathname === LANDING_PATH;
  } catch {
    return false;
  }
}

export function planBack(ctx: BackContext): BackPlan {
  const { entries, currentIndex } = ctx;
  if (entries && currentIndex !== undefined && currentIndex >= 0) {
    // a entrada da LP mais recente antes desta (pode ter passado por /equipes no meio)
    const landing = [...entries]
      .filter((entry) => entry.index < currentIndex)
      .sort((a, b) => b.index - a.index)
      .find((entry) => isLanding(entry.url, ctx.origin));
    if (landing) return { kind: 'traverse', key: landing.key };
  }
  if (ctx.historyLength > 1 && isLanding(ctx.referrer, ctx.origin)) return { kind: 'back' };
  return { kind: 'navigate' };
}

interface NavigationLike {
  entries(): HistoryEntryLike[];
  currentEntry: HistoryEntryLike | null;
  traverseTo(key: string): { committed?: Promise<unknown>; finished?: Promise<unknown> } | undefined;
}

function navigationApi(): NavigationLike | null {
  const nav = (window as Window & { navigation?: NavigationLike }).navigation;
  return nav && typeof nav.entries === 'function' && typeof nav.traverseTo === 'function' ? nav : null;
}

export function currentBackContext(): BackContext {
  const nav = navigationApi();
  const base = { referrer: document.referrer, origin: location.origin, historyLength: history.length };
  if (!nav?.currentEntry) return base;
  try {
    return { ...base, entries: nav.entries(), currentIndex: nav.currentEntry.index };
  } catch {
    return base;
  }
}

// se a volta no histórico não acontecer (entrada sumiu, navegador recusou), segue pelo link
const FALLBACK_MS = 900;

export class BackToEventLinks {
  mount(): void {
    document.addEventListener('click', this.onClick);
  }

  private readonly onClick = (event: MouseEvent): void => {
    if (event.defaultPrevented || event.button !== 0) return;
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link =
      event.target instanceof Element
        ? event.target.closest<HTMLAnchorElement>('a[data-back-to-event]')
        : null;
    if (!link) return;
    const plan = planBack(currentBackContext());
    if (plan.kind === 'navigate') return;
    event.preventDefault();
    if (plan.kind === 'traverse') {
      // a promessa recusa se a viagem for cancelada: o timer abaixo cobre, sem erro solto no console
      const result = navigationApi()?.traverseTo(plan.key);
      result?.committed?.catch(() => undefined);
      result?.finished?.catch(() => undefined);
    } else {
      history.back();
    }
    const fallback = window.setTimeout(() => location.assign(link.href), FALLBACK_MS);
    window.addEventListener('pagehide', () => window.clearTimeout(fallback), { once: true });
  };
}

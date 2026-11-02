// montar DOM sem innerHTML: nome de pessoa vem da planilha e entra sempre como texto
type Child = Node | string | null | undefined | false;
type Attrs = Record<string, string | boolean | null | undefined>;

export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs: Attrs = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  for (const [name, value] of Object.entries(attrs)) {
    if (value === null || value === undefined || value === false) continue;
    el.setAttribute(name, value === true ? '' : value);
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    el.append(child);
  }
  return el;
}

export function mustFind<T extends Element>(selector: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(selector);
  if (!el) throw new Error(`Elemento não encontrado: ${selector}`);
  return el;
}

export const pokemonImage = (id: number): string => `/pokemon/${id}.webp`;

// leva a tela até o card que acabou de aparecer (só rola quando ele está fora da tela)
export function follow(el: Element, reducedMotion: boolean): void {
  el.scrollIntoView({ block: 'nearest', behavior: reducedMotion ? 'auto' : 'smooth' });
}

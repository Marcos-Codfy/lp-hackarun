import { qs, qsa } from '@shared/utils/dom';

// tradução caminho do VM <-> elemento do DOM, num lugar só
export const rowsOf = (root: ParentNode): HTMLElement[] => qsa('[data-member-row]', root);

export function pathOf(control: HTMLElement): string | null {
  if (control.dataset['field']) return control.dataset['field'];
  const field = control.dataset['memberField'];
  const row = control.closest<HTMLElement>('[data-member-row]');
  const list = row?.parentElement;
  if (!field || !row || !list) return null;
  return `members.${Array.prototype.indexOf.call(list.children, row)}.${field}`;
}

export function controlFor(root: HTMLElement, path: string): HTMLElement | null {
  const member = /^members\.(\d+)\.(\w+)$/.exec(path);
  if (member) {
    const row = rowsOf(root)[Number(member[1])];
    return row ? qs(`[data-member-field="${member[2]}"]`, row) : null;
  }
  // erro do grupo: leva pro primeiro integrante (ou pro botão de adicionar)
  if (path === 'members')
    return qs('[data-member-row] [data-member-field="name"]', root) ?? qs('[data-member-add]', root);
  // foco depois de remover o último integrante
  if (path === 'members.add') return qs('[data-member-add]', root);
  return qs(`[data-field="${path}"]`, root);
}

// "Integrante 3 · E-mail" pro resumo de erros
export function labelFor(root: HTMLElement, path: string): string {
  if (path === 'members') return 'Integrantes';
  if (path === 'acceptedTerms') return 'Regulamento e LGPD';
  const control = controlFor(root, path);
  const label = control?.id ? qs(`label[for="${control.id}"]`, root) : null;
  // primeiro nó de texto = o rótulo sem o "(opcional)"
  const text = (label?.firstChild?.textContent ?? '').replace(/\s+/g, ' ').trim();
  const member = /^members\.(\d+)\./.exec(path);
  return member ? `Integrante ${Number(member[1]) + 1} · ${text}` : text;
}

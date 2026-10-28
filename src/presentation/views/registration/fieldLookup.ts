import { qs } from '@shared/utils/dom';

// tradução caminho do VM <-> elemento do DOM, num lugar só. Grupo de opções (radio) tem o
// [data-field-group] no fieldset; cada opção leva o mesmo data-field
export function pathOf(control: HTMLElement): string | null {
  return control.dataset['field'] ?? control.dataset['fieldGroup'] ?? null;
}

export function controlFor(root: HTMLElement, path: string): HTMLElement | null {
  const radios = qs<HTMLInputElement>(`input[type="radio"][data-field="${path}"]`, root);
  if (radios) return qs(`input[type="radio"][data-field="${path}"]:checked`, root) ?? radios;
  return qs(`[data-field="${path}"]`, root);
}

// "WhatsApp" ou "Você estuda atualmente?" pro resumo de erros. O aceite se chama "Regulamento e LGPD" na
// inscrição; o formulário de mentor troca o nome em data-consent-label (ele não tem regulamento)
export function labelFor(root: HTMLElement, path: string): string {
  if (path === 'acceptedTerms') return root.dataset['consentLabel'] ?? 'Regulamento e LGPD';
  const group = qs(`[data-field-group="${path}"]`, root);
  const legend = group ? qs('legend', group) : null;
  const control = group ? null : controlFor(root, path);
  const label = legend ?? (control?.id ? qs(`label[for="${control.id}"]`, root) : null);
  // primeiro nó de texto = o rótulo sem o "(opcional)"
  return (label?.firstChild?.textContent ?? '').replace(/\s+/g, ' ').trim();
}

import type { RegistrationErrors } from '@domain/index';
import { qs, qsa } from '@shared/utils/dom';
import type { FieldError } from '@presentation/view-models/registration/RegistrationFormViewModel';
import { groupErrors, joinParts, type ErrorGroup } from './errorGroups';
import { controlFor, labelFor, pathOf } from './fieldLookup';

const setAttr = (el: Element, name: string, value: string | null) => {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
};

// reconcilia aria-invalid/aria-describedby/texto com o estado; só escreve o que mudou
export class ErrorPresenter {
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  render(errors: RegistrationErrors): void {
    for (const control of qsa('[data-field], [data-member-field]', this.root)) {
      const error = control.id ? document.getElementById(`${control.id}-error`) : null;
      if (!error) continue;
      const path = pathOf(control);
      const message = (path && errors[path]) || null;
      this.paint(error, message);
      setAttr(control, 'aria-invalid', message ? 'true' : null);
      const ids = [control.dataset['describedbyBase'], message ? error.id : null].filter(Boolean).join(' ');
      setAttr(control, 'aria-describedby', ids || null);
    }
    const group = qs('[data-error-for="members"]', this.root);
    if (group) this.paint(group, errors['members'] ?? null);
  }

  renderSummary(visible: boolean, errors: readonly FieldError[]): void {
    const summary = qs('[data-error-summary]', this.root);
    const list = qs('[data-error-summary-list]', this.root);
    if (!summary || !list) return;
    summary.hidden = !visible || errors.length === 0;
    if (summary.hidden) return;
    const title = qs('[data-error-summary-title]', this.root);
    if (title) title.textContent = this.summaryTitle(errors.length);
    list.replaceChildren(...groupErrors(errors).map((group) => this.item(group)));
  }

  // um item por bloco, com link pro 1º campo dele. Bloco com um erro só (o e-mail já inscrito, por exemplo)
  // mantém a frase exata; com vários, só os nomes dos campos ("Integrante 2: nome, matrícula e e-mail")
  private item(group: ErrorGroup): HTMLLIElement {
    const [first] = group.errors;
    const item = document.createElement('li');
    if (!first) return item;
    const link = document.createElement('a');
    const control = controlFor(this.root, first.path);
    link.href = control?.id ? `#${control.id}` : '#';
    link.dataset['focusPath'] = first.path;
    link.textContent =
      group.errors.length > 1 && group.title
        ? `${group.title}: ${joinParts(group.parts)}`
        : `${labelFor(this.root, first.path)}: ${first.message}`;
    item.append(link);
    return item;
  }

  private summaryTitle(count: number): string {
    return count === 1 ? 'Falta ajustar 1 campo:' : `Faltam ajustar ${count} campos:`;
  }

  private paint(el: HTMLElement, message: string | null): void {
    const text = message ?? '';
    if (el.textContent !== text) el.textContent = text;
    el.hidden = !message;
  }
}

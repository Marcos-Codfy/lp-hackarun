import type { RegistrationErrors } from '@domain/index';
import { qs, qsa } from '@shared/utils/dom';
import type { FieldError } from '@presentation/view-models/registration/RegistrationFormViewModel';
import { controlFor, labelFor, pathOf } from './fieldLookup';

const setAttr = (el: Element, name: string, value: string | null) => {
  if (value === null) {
    if (el.hasAttribute(name)) el.removeAttribute(name);
  } else if (el.getAttribute(name) !== value) {
    el.setAttribute(name, value);
  }
};

// reconcilia aria-invalid/aria-describedby/texto com o estado; só escreve o que mudou.
// Cada campo (ou grupo de opções) tem o erro em #<id>-error
export class ErrorPresenter {
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  render(errors: RegistrationErrors): void {
    for (const control of qsa('[data-field]:not([type="radio"]), [data-field-group]', this.root)) {
      const error = control.id ? document.getElementById(`${control.id}-error`) : null;
      if (!error) continue;
      const path = pathOf(control);
      const message = (path && errors[path]) || null;
      this.paint(error, message);
      setAttr(control, 'aria-invalid', message ? 'true' : null);
      const ids = [control.dataset['describedbyBase'], message ? error.id : null].filter(Boolean).join(' ');
      setAttr(control, 'aria-describedby', ids || null);
    }
  }

  renderSummary(visible: boolean, errors: readonly FieldError[]): void {
    const summary = qs('[data-error-summary]', this.root);
    const list = qs('[data-error-summary-list]', this.root);
    if (!summary || !list) return;
    summary.hidden = !visible || errors.length === 0;
    if (summary.hidden) return;
    const title = qs('[data-error-summary-title]', this.root);
    if (title) title.textContent = this.summaryTitle(errors.length);
    list.replaceChildren(...errors.map((error) => this.item(error)));
  }

  // um item por campo, com link pra ele: "WhatsApp: Confira o número..."
  private item(error: FieldError): HTMLLIElement {
    const item = document.createElement('li');
    const link = document.createElement('a');
    const control = controlFor(this.root, error.path);
    link.href = control?.id ? `#${control.id}` : '#';
    link.dataset['focusPath'] = error.path;
    const label = labelFor(this.root, error.path);
    link.textContent = label ? `${label}: ${error.message}` : error.message;
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

import { qs } from '@shared/utils/dom';
import type { MemberFields, MemberKey } from '@presentation/view-models/registration/RegistrationFields';

export interface MemberRowEvents {
  input(index: number, field: MemberKey, value: string): void;
  blur(index: number, field: MemberKey): void;
  remove(index: number): void;
}

const KEY_ATTRS = ['id', 'for', 'aria-describedby', 'data-describedby-base'];

// linhas de integrante por chave: o valor digitado nunca se perde quando alguém remove uma linha.
// As linhas que já vêm no HTML (data-member-key 0, 1...) são adotadas no lugar de clonar outras
export class MemberRows {
  private readonly list: HTMLElement;
  private readonly template: HTMLTemplateElement;

  constructor(list: HTMLElement, template: HTMLTemplateElement, events: MemberRowEvents) {
    this.list = list;
    this.template = template;
    this.listen(events);
  }

  sync(members: readonly MemberFields[], canRemove: boolean): void {
    const existing = new Map<number, HTMLElement>();
    Array.from(this.list.children).forEach((row) => {
      if (row instanceof HTMLElement) existing.set(Number(row.dataset['memberKey']), row);
    });
    const keys = new Set(members.map((m) => m.key));
    existing.forEach((row, key) => {
      if (!keys.has(key)) row.remove();
    });
    members.forEach((member, i) => {
      const row = existing.get(member.key) ?? this.create(member.key);
      if (this.list.children[i] !== row) this.list.insertBefore(row, this.list.children[i] ?? null);
      this.label(row, i, canRemove);
    });
  }

  private create(key: number): HTMLElement {
    const row = this.template.content.firstElementChild?.cloneNode(true) as HTMLElement;
    row.dataset['memberKey'] = String(key);
    // ids únicos por linha: troca o __KEY__ do molde
    for (const el of [row, ...Array.from(row.querySelectorAll('*'))]) {
      for (const attr of KEY_ATTRS) {
        const value = el.getAttribute(attr);
        if (value?.includes('__KEY__')) el.setAttribute(attr, value.replaceAll('__KEY__', String(key)));
      }
    }
    return row;
  }

  // o integrante 1 é o contato da equipe: tem o selo, o aviso do e-mail e nunca sai
  private label(row: HTMLElement, index: number, canRemove: boolean): void {
    const number = index + 1;
    const contact = index === 0;
    const title = qs('[data-member-title]', row);
    if (title) title.textContent = `Integrante ${number}`;
    row.classList.toggle('is-contact', contact);
    row.querySelectorAll<HTMLElement>('[data-contact-only]').forEach((el) => (el.hidden = !contact));
    // quem preenche costuma ser o contato: nome e e-mail dele aceitam o preenchimento automático (WCAG 1.3.5)
    qs('[data-member-field="name"]', row)?.setAttribute('autocomplete', contact ? 'name' : 'off');
    qs('[data-member-field="email"]', row)?.setAttribute('autocomplete', contact ? 'email' : 'off');
    const remove = qs<HTMLButtonElement>('[data-member-remove]', row);
    if (remove) {
      remove.hidden = contact;
      remove.disabled = contact || !canRemove;
      remove.setAttribute('aria-label', `Remover integrante ${number}`);
    }
  }

  private listen(events: MemberRowEvents): void {
    const locate = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return null;
      const row = target.closest<HTMLElement>('[data-member-row]');
      if (!row) return null;
      return { target, index: Array.prototype.indexOf.call(this.list.children, row) as number };
    };
    this.list.addEventListener('input', (e) => {
      const hit = locate(e.target);
      const field = hit?.target.dataset['memberField'] as MemberKey | undefined;
      if (hit && field && hit.target instanceof HTMLInputElement)
        events.input(hit.index, field, hit.target.value);
    });
    this.list.addEventListener('focusout', (e) => {
      const hit = locate(e.target);
      const field = hit?.target.dataset['memberField'] as MemberKey | undefined;
      if (hit && field) events.blur(hit.index, field);
    });
    this.list.addEventListener('click', (e) => {
      const hit = locate(e.target);
      if (hit?.target.closest('[data-member-remove]')) events.remove(hit.index);
    });
  }
}

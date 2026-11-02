import { h, mustFind } from './dom';

// diálogo de confirmação das telas do sorteio (gravar, sortear de novo); resolve true no botão de confirmar
export function confirmDialog(options: { title: string; text: string; yes: string }): Promise<boolean> {
  return new Promise((resolve) => {
    const dialog = h(
      'dialog',
      { class: 'dialog' },
      h('h2', {}, options.title),
      h('p', { class: 'dialog__hint' }, options.text),
      h(
        'div',
        { class: 'dialog__actions' },
        h('button', { class: 'btn', type: 'button', 'data-no': true }, 'Cancelar'),
        h('button', { class: 'btn btn--primary', type: 'button', 'data-yes': true }, options.yes),
      ),
    );
    document.body.append(dialog);
    const done = (answer: boolean) => {
      dialog.close();
      dialog.remove();
      resolve(answer);
    };
    mustFind('[data-yes]', dialog).addEventListener('click', () => done(true));
    mustFind('[data-no]', dialog).addEventListener('click', () => done(false));
    dialog.addEventListener('cancel', () => done(false));
    dialog.showModal();
  });
}

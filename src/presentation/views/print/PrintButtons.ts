import { qsa } from '@shared/utils/dom';

// botões "Imprimir" ([data-print]): a CSP não deixa onclick inline, então o JS do LightApp liga aqui. Sem JS o
// botão continua escondido (hidden no HTML) e vale a dica do Ctrl+P ao lado
export class PrintButtons {
  private readonly buttons: HTMLButtonElement[];
  private readonly print: () => void;

  constructor(
    buttons: HTMLButtonElement[] = qsa<HTMLButtonElement>('button[data-print]'),
    print: () => void = () => window.print(),
  ) {
    this.buttons = buttons;
    this.print = print;
  }

  mount(): void {
    for (const button of this.buttons) {
      button.hidden = false;
      button.addEventListener('click', this.onClick);
    }
  }

  destroy(): void {
    for (const button of this.buttons) button.removeEventListener('click', this.onClick);
  }

  private readonly onClick = (): void => {
    this.print();
  };
}

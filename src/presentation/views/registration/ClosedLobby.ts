import { qs, qsa } from '@shared/utils/dom';

// build de antes do prazo aberto depois dele: troca o formulário pelo aviso de encerrada, sem recarregar.
// [data-reg-closed] é o aviso pronto (escondido) que o RegistrationForm renderiza; sem ele, monta um simples
export class ClosedLobby {
  private readonly root: HTMLElement;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  show(): void {
    this.root.dataset['status'] = 'closed';
    qsa('[data-reg-closing-badge], .notice-badge', this.root).forEach((el) => (el.hidden = true));
    const panel = qs('[data-reg-panel], .regform__panel', this.root);
    if (panel) panel.hidden = true;
    const notice = qs('[data-reg-closed]', this.root) ?? this.buildNotice(panel);
    notice.hidden = false;
  }

  private buildNotice(before: HTMLElement | null): HTMLElement {
    const notice = document.createElement('div');
    notice.className = 'regform__failure';
    notice.dataset['regClosed'] = '';
    // h2, como o aviso pronto do servidor: logo abaixo do h1 da página
    const title = document.createElement('h2');
    // título focável: quem chega pelo teclado ou pelo leitor de tela acha o aviso
    title.dataset['regNoticeTitle'] = '';
    title.tabIndex = -1;
    title.textContent = 'Inscrições encerradas';
    const text = document.createElement('p');
    text.textContent = 'O prazo terminou. Valeu pelo interesse! Acompanhe quem vai correr.';
    const link = document.createElement('a');
    link.href = '/equipes';
    link.textContent = 'Ver equipes confirmadas';
    notice.append(title, text, link);
    this.root.insertBefore(notice, before && before.parentElement === this.root ? before : null);
    return notice;
  }
}

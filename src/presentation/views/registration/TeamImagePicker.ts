import type { PreparedTeamImageDTO } from '@application/index';
import { qs } from '@shared/utils/dom';
import type { RegistrationFormState } from '@presentation/view-models/registration/RegistrationFormViewModel';

const FORMAT_LABEL: Record<PreparedTeamImageDTO['mimeType'], string> = {
  'image/webp': 'WebP',
  'image/jpeg': 'JPG',
  'image/png': 'PNG',
};

// espaço que não quebra: "800 × 600 px" e "54 KB · WebP" ficam inteiros, a linha só vira entre os dois
const NBSP = String.fromCharCode(0xa0);

const kb = (bytes: number) => `${Math.max(1, Math.round(bytes / 1024))}${NBSP}KB`;

export const imageMeta = (image: PreparedTeamImageDTO): string => {
  const size = [image.width, '×', image.height, 'px'].join(NBSP);
  return `${size} · ${kb(image.bytes)}${NBSP}·${NBSP}${FORMAT_LABEL[image.mimeType]}`;
};

export const previewSrc = (image: PreparedTeamImageDTO): string =>
  `data:${image.mimeType};base64,${image.base64}`;

// [data-team-image]: campo da foto/logo. O input nativo é o controle (rótulo, erro e foco do resumo apontam
// pra ele); arrastar e soltar e o "Trocar imagem" só entregam o arquivo pro VM
export class TeamImagePicker {
  private readonly root: HTMLElement;
  private readonly input: HTMLInputElement | null;
  private shown: PreparedTeamImageDTO | null = null;

  constructor(form: HTMLElement, choose: (file: File) => void) {
    this.root = qs('[data-team-image]', form) ?? form;
    this.input = qs<HTMLInputElement>('input[type="file"][data-field="teamImage"]', form);
    this.listen(choose);
  }

  render(state: RegistrationFormState): void {
    const { imageStatus: status } = state;
    const image = state.fields.teamImage;
    const preview = qs('[data-team-image-preview]', this.root);
    const hadFocus = !!preview && preview.contains(document.activeElement);
    this.root.dataset['status'] = status;
    qs('[data-team-image-zone]', this.root)?.setAttribute('aria-busy', String(status === 'processing'));
    if (image !== this.shown) this.show(image);
    if (preview) preview.hidden = !image;
    const empty = qs('[data-team-image-empty]', this.root);
    if (empty) empty.hidden = !!image;
    // com a prévia na tela quem age é o "Trocar imagem": o input sai do Tab pra não virar parada dupla
    if (this.input) this.input.tabIndex = image ? -1 : 0;
    if (hadFocus && !image) this.input?.focus();
    this.announce(status, image, state.errors['teamImage'] ?? null);
  }

  private show(image: PreparedTeamImageDTO | null): void {
    this.shown = image;
    const src = image ? previewSrc(image) : '';
    ['[data-team-image-img]', '[data-team-image-backdrop]'].forEach((sel) => {
      const img = qs<HTMLImageElement>(sel, this.root);
      if (!img) return;
      if (src) img.src = src;
      else img.removeAttribute('src');
    });
    const meta = qs('[data-team-image-meta]', this.root);
    if (meta) meta.textContent = image ? imageMeta(image) : '';
  }

  private announce(status: string, image: PreparedTeamImageDTO | null, problem: string | null): void {
    const live = qs('[data-team-image-status]', this.root);
    if (!live) return;
    const text =
      status === 'processing'
        ? 'Preparando a imagem.'
        : status === 'ready' && image
          ? `Imagem pronta para o envio: ${imageMeta(image)}.`
          : status === 'invalid'
            ? (problem ?? '')
            : '';
    if (live.textContent !== text) live.textContent = text;
  }

  private listen(choose: (file: File) => void): void {
    const input = this.input;
    input?.addEventListener('change', () => {
      const file = input.files?.[0];
      if (file) choose(file);
      // mesmo arquivo escolhido de novo (depois de um erro) precisa disparar o change
      input.value = '';
    });
    qs('[data-team-image-change]', this.root)?.addEventListener('click', () => input?.click());
    const zone = qs('[data-team-image-zone]', this.root);
    if (!zone) return;
    const hasFile = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    zone.addEventListener('dragover', (e) => {
      if (!hasFile(e)) return;
      e.preventDefault();
      zone.classList.add('is-dragover');
    });
    zone.addEventListener('dragleave', () => zone.classList.remove('is-dragover'));
    zone.addEventListener('drop', (e) => {
      zone.classList.remove('is-dragover');
      const file = e.dataTransfer?.files[0];
      if (!file) return;
      e.preventDefault();
      choose(file);
    });
  }
}

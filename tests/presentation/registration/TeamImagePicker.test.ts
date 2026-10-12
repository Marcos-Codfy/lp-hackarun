import { beforeEach, describe, expect, it } from 'vitest';
import { fail } from '@domain/index';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { RegistrationFormView } from '@presentation/views/RegistrationFormView';
import { imageMeta, previewSrc } from '@presentation/views/registration/TeamImagePicker';
import { preparedImage } from '../../helpers/images';
import { setupForm, type FormSetupOptions } from './formSetup';

// o mínimo do RegistrationForm.astro + TeamImageField.astro que a View toca
const markup = `
  <div data-registration-form data-status="open" data-team-min="2" data-team-max="5">
    <div class="regform__panel" data-reg-panel>
      <form data-reg-form>
        <input type="radio" name="mode" value="team" checked data-reg-mode />
        <div data-error-summary hidden><p data-error-summary-title></p><ul data-error-summary-list></ul></div>
        <div data-team-image data-status="empty">
          <label for="reg-team-image">Foto ou logo da equipe</label>
          <p id="reg-team-image-hint">dica</p>
          <div data-team-image-zone>
            <input id="reg-team-image" type="file" data-field="teamImage"
              data-describedby-base="reg-team-image-hint" aria-describedby="reg-team-image-hint" />
            <div data-team-image-empty></div>
            <figure data-team-image-preview hidden>
              <img data-team-image-backdrop alt="" /><img data-team-image-img alt="Prévia" />
              <span data-team-image-meta></span>
              <button type="button" data-team-image-change>Trocar imagem</button>
            </figure>
          </div>
          <p data-team-image-status></p>
          <p id="reg-team-image-error" data-error-for="teamImage" hidden></p>
        </div>
        <button type="submit" data-reg-submit><span class="btn__label">Confirmar inscrição</span></button>
      </form>
      <p data-reg-live></p>
    </div>
  </div>`;

function mount(options: FormSetupOptions = {}) {
  document.body.innerHTML = markup;
  const { vm, prepareImage } = setupForm(options);
  const root = document.querySelector<HTMLElement>('[data-registration-form]') as HTMLElement;
  new RegistrationFormView(root, vm, new EventBus<AppEvents>()).mount();
  const el = <T extends HTMLElement = HTMLElement>(selector: string) => root.querySelector<T>(selector) as T;
  const input = el<HTMLInputElement>('#reg-team-image');
  // happy-dom não deixa atribuir FileList: o change chega com o arquivo "escolhido"
  const pick = async (file: File) => {
    Object.defineProperty(input, 'files', { value: [file], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await prepareImage.execute.mock.results.at(-1)?.value;
    await Promise.resolve();
  };
  return { vm, el, input, pick, prepareImage };
}

const png = () => new File([new Uint8Array(300)], 'logo.png', { type: 'image/png' });

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('TeamImagePicker', () => {
  it('arquivo escolhido vira prévia acessível; o "Trocar imagem" assume o Tab', async () => {
    const { el, input, pick, prepareImage } = mount();
    await pick(png());
    expect(prepareImage.execute).toHaveBeenCalledTimes(1);
    const image = preparedImage();
    expect(el('[data-team-image]').dataset['status']).toBe('ready');
    expect(el('[data-team-image-preview]').hidden).toBe(false);
    expect(el('[data-team-image-empty]').hidden).toBe(true);
    expect(el<HTMLImageElement>('[data-team-image-img]').getAttribute('src')).toBe(previewSrc(image));
    expect(el('[data-team-image-meta]').textContent).toBe(imageMeta(image));
    expect(el('[data-team-image-status]').textContent).toContain('Imagem pronta para o envio');
    expect(input.tabIndex).toBe(-1);
    expect(input.getAttribute('aria-invalid')).toBeNull();
  });

  it('arquivo recusado: erro ligado no input (aria-invalid + describedby) e anunciado', async () => {
    const { el, input, pick } = mount({ prepare: async () => fail('Use uma imagem JPG, PNG ou WebP.') });
    await pick(png());
    expect(el('[data-team-image]').dataset['status']).toBe('invalid');
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(input.getAttribute('aria-describedby')).toBe('reg-team-image-hint reg-team-image-error');
    expect(el('#reg-team-image-error').textContent).toBe('Use uma imagem JPG, PNG ou WebP.');
    expect(el('[data-team-image-status]').textContent).toBe('Use uma imagem JPG, PNG ou WebP.');
    expect(input.tabIndex).toBe(0);
  });

  it('soltar um arquivo na área também envia pro preparo', async () => {
    const { el, prepareImage } = mount();
    const drop = new Event('drop', { bubbles: true, cancelable: true });
    Object.defineProperty(drop, 'dataTransfer', { value: { files: [png()], types: ['Files'] } });
    el('[data-team-image-zone]').dispatchEvent(drop);
    expect(drop.defaultPrevented).toBe(true);
    expect(prepareImage.execute).toHaveBeenCalledTimes(1);
  });

  it('o resumo de erros do envio leva até o campo da foto', async () => {
    const { vm, el, input } = mount();
    vm.setText('teamName', 'Bug Busters');
    await vm.submit();
    const link = el('[data-error-summary-list] a');
    expect(link?.textContent).toBe('Foto ou logo da equipe: Envie uma foto ou a logo da equipe.');
    link?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(document.activeElement).toBe(input);
  });
});

describe('imageMeta', () => {
  it('a linha só quebra entre a resolução e o peso ("WebP" nunca fica sozinho)', () => {
    const nbsp = String.fromCharCode(0xa0);
    const text = imageMeta(preparedImage({ width: 800, height: 600, bytes: 54 * 1024 }));
    expect(text.split(nbsp).join(' ')).toBe('800 × 600 px · 54 KB · WebP');
    expect(text.split(' ')).toEqual([
      `800${nbsp}×${nbsp}600${nbsp}px`,
      '·',
      `54${nbsp}KB${nbsp}·${nbsp}WebP`,
    ]);
  });
});

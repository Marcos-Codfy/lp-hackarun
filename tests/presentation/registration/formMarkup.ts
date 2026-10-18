// o mínimo do RegistrationForm.astro que as Views tocam (mesmos data-* e ids); extra vai depois do
// formulário (ex.: a faixa do rascunho)
const text = (id: string, field: string, label: string, type = 'text') => `
  <div class="field">
    <label for="${id}">${label}</label>
    <input id="${id}" type="${type}" data-field="${field}" />
    <p id="${id}-error" hidden></p>
  </div>`;

const choice = (id: string, field: string, legend: string, values: string[]) => `
  <fieldset id="${id}" data-field-group="${field}">
    <legend>${legend}</legend>
    ${values.map((v) => `<input type="radio" id="${id}-${v}" name="${field}" value="${v}" data-field="${field}" />`).join('')}
    <p id="${id}-error" hidden></p>
  </fieldset>`;

const select = (id: string, field: string, label: string, values: string[]) => `
  <div class="field">
    <label for="${id}">${label}</label>
    <select id="${id}" data-field="${field}"><option value="">Escolha</option>${values
      .map((v) => `<option value="${v}">${v}</option>`)
      .join('')}</select>
    <p id="${id}-error" hidden></p>
  </div>`;

export const formMarkup = (extra = ''): string => `
  <div data-registration-form data-status="open">
    <div data-reg-panel>
      <form data-reg-form>
        <div data-error-summary tabindex="-1" hidden>
          <p data-error-summary-title></p><ul data-error-summary-list></ul>
        </div>
        ${text('reg-name', 'name', 'Nome completo')}
        ${text('reg-email', 'email', 'E-mail', 'email')}
        ${text('reg-whatsapp', 'whatsapp', 'WhatsApp', 'tel')}
        ${choice('reg-adult', 'adult', 'Você tem 18 anos ou mais?', ['yes', 'no'])}
        <div data-minor-notice hidden><a href="/autorizacao">modelo</a></div>
        ${choice('reg-profile', 'profile', 'Você estuda atualmente?', [
          'unicatolica',
          'other-institution',
          'graduate',
          'self-taught',
        ])}
        <div data-profile-details hidden>
          <div data-show-field="institution" hidden>${text('reg-institution', 'institution', 'Instituição')}</div>
          <div data-show-field="course" hidden>${text('reg-course', 'course', 'Curso')}</div>
          <div data-show-field="period" hidden>${select('reg-period', 'period', 'Período', ['1', '2', '3'])}</div>
          <div data-show-field="studentId" hidden>${text('reg-student-id', 'studentId', 'Matrícula na UniCatólica')}</div>
          <div data-show-field="area" hidden>${select('reg-area', 'area', 'Área', ['development', 'security'])}</div>
        </div>
        <label for="reg-terms">Aceite</label>
        <input id="reg-terms" type="checkbox" data-field="acceptedTerms" />
        <p id="reg-terms-error" hidden></p>
        <input id="reg-website" data-field="honeypot" />
        <div data-reg-failure hidden><p data-reg-failure-text></p><button type="button" data-reg-retry></button></div>
        <button type="submit" data-reg-submit><span class="btn__label">Confirmar inscrição</span></button>
      </form>
      <div data-reg-success hidden>
        <h2 tabindex="-1" data-reg-success-title></h2>
        <span data-reg-protocol></span><strong data-reg-contact-email></strong>
        <p data-reg-guardian hidden></p>
      </div>
      <p data-reg-live></p>
    </div>
  </div>${extra}`;

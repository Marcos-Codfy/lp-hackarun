// o mínimo do MentorForm.astro que a View toca (mesmos data-* e ids); a conferência com o .astro de verdade fica em
// MentorFormMarkup.test.ts
const text = (id: string, field: string, label: string, type = 'text') => `
  <div class="field">
    <label for="${id}">${label}</label>
    <input id="${id}" type="${type}" data-field="${field}" />
    <p id="${id}-error" hidden></p>
  </div>`;

const choice = (id: string, field: string, legend: string, values: string[], type = 'radio') => `
  <fieldset id="${id}" data-field-group="${field}">
    <legend>${legend}</legend>
    ${values.map((v) => `<input type="${type}" id="${id}-${v}" name="${field}" value="${v}" data-field="${field}" />`).join('')}
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

export const mentorMarkup = (status = 'open'): string => `
  <div data-mentor-form data-status="${status}" data-consent-label="Termos e LGPD">
    <div data-reg-closed hidden><h2 data-reg-notice-title tabindex="-1">Cadastro de mentores encerrado</h2></div>
    <div data-reg-panel>
      <form data-reg-form>
        <div data-error-summary tabindex="-1" hidden>
          <p data-error-summary-title></p><ul data-error-summary-list></ul>
        </div>
        ${text('mentor-name', 'name', 'Nome completo')}
        ${text('mentor-email', 'email', 'E-mail', 'email')}
        ${text('mentor-whatsapp', 'whatsapp', 'WhatsApp', 'tel')}
        ${select('mentor-area', 'area', 'Área de atuação', ['development', 'security'])}
        ${text('mentor-role', 'role', 'Cargo ou função')}
        ${text('mentor-company', 'company', 'Empresa')}
        ${select('mentor-experience', 'experience', 'Tempo de experiência', ['2-to-5', '5-to-10'])}
        ${choice('mentor-graduate', 'graduate', 'Você é egresso(a) da UniCatólica?', ['yes', 'no'])}
        <div data-show-field="course" hidden>${text('mentor-course', 'course', 'Curso em que se formou')}</div>
        <div data-show-field="graduationYear" hidden>${text('mentor-graduation-year', 'graduationYear', 'Ano de formatura')}</div>
        ${choice('mentor-days', 'days', 'Em quais dias você pode ajudar?', ['11', '12', '13', '14', 'tbd'], 'checkbox')}
        ${choice('mentor-format', 'format', 'Como prefere participar?', ['in-person', 'online', 'either'])}
        ${choice('mentor-mode', 'mode', 'Que tipo de mentoria prefere?', ['one-team', 'on-demand', 'either'])}
        <label for="mentor-may-publish"><input id="mentor-may-publish" type="checkbox" data-field="mayPublish" />Divulgar</label>
        <label for="mentor-terms"><input id="mentor-terms" type="checkbox" data-field="acceptedTerms" />Aceito</label>
        <p id="mentor-terms-error" data-error-for="acceptedTerms" hidden></p>
        <input id="mentor-website" data-field="honeypot" />
        <div data-reg-failure hidden><p data-reg-failure-text></p><button type="button" data-reg-retry hidden>Tentar de novo</button></div>
        <button type="submit" data-reg-submit><span class="btn__label">Enviar cadastro</span></button>
      </form>
      <div data-reg-success hidden>
        <h2 data-reg-success-title tabindex="-1">Cadastro recebido!</h2>
        <span data-reg-protocol></span><span data-reg-protocol-typed></span>
        <strong data-reg-contact-email>o seu e-mail</strong>
      </div>
      <p data-reg-live></p>
    </div>
  </div>`;

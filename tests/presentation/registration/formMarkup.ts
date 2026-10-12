// o mínimo do RegistrationForm.astro (cards do mínimo da equipe vindos do HTML, molde e resumo de erros) que
// as Views tocam; extra vai depois do formulário (ex.: a faixa do rascunho)
const field = (key: string, name: string, label: string, autocomplete = 'off') => `
  <div class="field">
    <label for="member-${key}-${name}">${label}</label>
    <input id="member-${key}-${name}" data-member-field="${name}" autocomplete="${autocomplete}" />
    <p id="member-${key}-${name}-error" hidden></p>
  </div>`;

// mesmo HTML do MemberRow: chave numérica nos cards do servidor, __KEY__ no molde
const row = (key: number | '__KEY__') => {
  const k = String(key);
  const attrs = typeof key === 'number' ? ` data-member-key="${k}"` : '';
  const contact = key === 0;
  return `<li data-member-row${attrs}><fieldset>
    <legend><span data-member-title>Integrante ${typeof key === 'number' ? key + 1 : ''}</span>
    <span data-contact-only ${contact ? '' : 'hidden'}>contato da equipe</span></legend>
    <button type="button" data-member-remove ${contact ? 'hidden' : ''} disabled>Remover</button>
    ${field(k, 'name', 'Nome completo', contact ? 'name' : 'off')}${field(k, 'studentId', 'Matrícula')}
    ${field(k, 'email', 'E-mail', contact ? 'email' : 'off')}
  </fieldset></li>`;
};

export const formMarkup = (extra = ''): string => `
  <div data-registration-form data-status="open" data-team-min="2" data-team-max="5">
    <div data-reg-panel>
      <span data-reg-squad></span>
      <form data-reg-form>
        <div data-error-summary tabindex="-1" hidden>
          <p data-error-summary-title></p><ul data-error-summary-list></ul>
        </div>
        <label for="reg-team-name">Nome da equipe</label>
        <input id="reg-team-name" data-field="teamName" />
        <p id="reg-team-name-error" hidden></p>
        <span data-member-count></span>
        <ol data-members-list>${row(0)}${row(1)}</ol>
        <p data-error-for="members" hidden></p>
        <button type="button" data-member-add><span data-member-add-label></span></button>
        <template data-member-template>${row('__KEY__')}</template>
        <label for="reg-terms">Aceite</label>
        <input id="reg-terms" type="checkbox" data-field="acceptedTerms" />
        <p id="reg-terms-error" hidden></p>
        <div data-reg-failure hidden><p data-reg-failure-text></p><button type="button" data-reg-retry></button></div>
        <button type="submit" data-reg-submit><span class="btn__label">Confirmar inscrição</span></button>
      </form>
      <div data-reg-success hidden><h3 tabindex="-1" data-reg-success-title></h3></div>
      <p data-reg-live></p>
    </div>
  </div>${extra}`;

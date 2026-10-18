// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, OTHER_KEY, person, registrationBody } from '../../helpers/apps-script/sandbox';

// a Ana já inscrita; a segunda pessoa é outra, com um dado "emprestado" dela
function withAna() {
  const script = new AppsScriptSandbox();
  expect(script.post(registrationBody()).ok).toBe(true);
  return script;
}

describe('Apps Script · cada pessoa se inscreve uma vez só', () => {
  it.each(['ana@exemplo.com', ' ANA@Exemplo.com '])(
    'e-mail já inscrito ("%s") vira duplicate_email',
    (email) => {
      const script = withAna();
      expect(script.post(person(1, { email }))).toEqual({ ok: false, error: 'duplicate_email' });
      expect(script.registrations.data).toHaveLength(1);
    },
  );

  it.each(['(63) 99999-0001', '63999990001', '+55 63 99999-0001', '063 99999 0001'])(
    'WhatsApp já inscrito escrito de outro jeito ("%s") vira duplicate_whatsapp',
    (whatsapp) => {
      const script = withAna();
      expect(script.post(person(1, { whatsapp }))).toEqual({ ok: false, error: 'duplicate_whatsapp' });
    },
  );

  it('matrícula já inscrita vira duplicate_student_id (sem diferenciar caixa)', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody({ studentId: 'RA-2023.044' }));
    expect(script.post(person(1, { studentId: 'ra-2023.044' }))).toEqual({
      ok: false,
      error: 'duplicate_student_id',
    });
  });

  it('matrícula vazia não conflita com outra matrícula vazia', () => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody({ studentId: '' })).ok).toBe(true);
    expect(script.post(person(1, { studentId: '' })).ok).toBe(true);
    expect(script.registrations.data).toHaveLength(2);
  });

  it('o e-mail é conferido antes do WhatsApp e da matrícula', () => {
    const script = withAna();
    expect(script.post(registrationBody({}, { idempotencyKey: OTHER_KEY })).error).toBe('duplicate_email');
  });

  it('inscrição cancelada libera o e-mail, o WhatsApp e a matrícula', () => {
    const script = withAna();
    script.edit(script.registrations, 0, 'Status', 'Cancelado');
    const res = script.post(registrationBody({}, { idempotencyKey: OTHER_KEY }));
    expect(res.ok).toBe(true);
    expect(script.registrations.data).toHaveLength(2);
  });

  it.each(['credenciado', 'ausente', 'inscrito'])('status %s continua segurando os dados', (status) => {
    const script = withAna();
    script.edit(script.registrations, 0, 'Status', status);
    expect(script.post(person(1, { email: 'ana@exemplo.com' })).error).toBe('duplicate_email');
  });

  it('linha escrita à mão na planilha (com apóstrofo do sheetSafe_) também conta', () => {
    const script = new AppsScriptSandbox();
    script.seed([
      { Protocolo: 'HR26-AAAAAA', 'E-mail': "'+ana@exemplo.com", WhatsApp: '63 98888-7777', Status: '' },
    ]);
    expect(script.post(registrationBody({ email: '+ana@exemplo.com' })).error).toBe('duplicate_email');
    expect(script.post(person(1, { whatsapp: '(63) 98888-7777' })).error).toBe('duplicate_whatsapp');
  });

  it('linha sem protocolo (anotação da organização) não segura nada', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ 'Nome completo': 'Anotação', 'E-mail': 'ana@exemplo.com' }]);
    expect(script.post(registrationBody()).ok).toBe(true);
  });
});

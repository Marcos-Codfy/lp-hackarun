// cadastro de mentores no Apps Script: o que é recusado, duplicados e reenvio
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  AppsScriptSandbox,
  KEY,
  mentorBody,
  otherMentor,
  registrationBody,
} from '../../helpers/apps-script/sandbox';
import { mentors, rowsOf } from '../../helpers/apps-script/mentorSheet';

describe('Apps Script · cadastro de mentores recusa o que não vale', () => {
  const cases: [string, Record<string, unknown>][] = [
    ['sem nome', { name: '' }],
    ['nome sem sobrenome', { name: 'Ana' }],
    ['e-mail torto', { email: 'ana@exemplo' }],
    ['WhatsApp torto', { whatsapp: '1234' }],
    ['área fora da lista', { area: 'magia' }],
    ['sem área', { area: '' }],
    ['experiência fora da lista', { experience: '20-anos' }],
    ['formato fora da lista', { format: 'hibrido' }],
    ['modo fora da lista', { mode: 'sempre' }],
    ['sem cargo', { role: '' }],
    ['cargo com símbolo de código', { role: 'dev <b>' }],
    ['cargo longo demais', { role: 'x'.repeat(81) }],
    ['empresa curta demais', { company: 'X' }],
    ['especialidades longas demais', { specialties: 'x'.repeat(121) }],
    ['observação longa demais', { notes: 'x'.repeat(301) }],
    ['LinkedIn que não é endereço', { linkedin: 'meu perfil' }],
    ['LinkedIn com script', { linkedin: 'https://exemplo.com/<script>' }],
    ['egresso como texto', { graduate: 'sim' }],
    ['sem resposta de egresso', { graduate: undefined }],
    ['egresso sem curso', { course: '' }],
    ['egresso sem ano', { graduationYear: '' }],
    ['ano antes do intervalo', { graduationYear: 1990 }],
    ['ano depois do intervalo', { graduationYear: 2031 }],
    ['nenhum dia', { days: [] }],
    ['dias que não existem', { days: ['10', '15'] }],
    ['dias como texto', { days: '13' }],
    ['divulgar como texto', { mayPublish: 'sim' }],
    ['sem resposta de divulgar', { mayPublish: undefined }],
  ];

  it.each(cases)('recusa: %s', (_case, mentor) => {
    const script = new AppsScriptSandbox();
    expect(script.post(mentorBody(mentor))).toEqual({ ok: false, error: 'invalid' });
    expect(script.book.sheets).toHaveLength(0);
  });

  it.each([
    ['sem mentor', { mentor: undefined }],
    ['mentor que é lista', { mentor: [] }],
    ['mentor que é texto', { mentor: 'Ana' }],
    ['sem aceite', { consentVersion: '' }],
    ['aceite do aviso dos participantes', { consentVersion: '2026-10-v5' }],
    ['aceite de uma versão antiga', { consentVersion: '2026-10-m0' }],
    ['aceite com data torta', { consentAt: 'ontem' }],
    ['honeypot preenchido', { honeypot: 'robô' }],
    ['preenchido rápido demais', { elapsedMs: 500 }],
    ['sem tempo de preenchimento', { elapsedMs: undefined }],
  ])('recusa envio %s', (_case, overrides) => {
    const script = new AppsScriptSandbox();
    expect(script.post(mentorBody({}, overrides))).toEqual({ ok: false, error: 'invalid' });
    expect(script.book.sheets).toHaveLength(0);
  });

  it('JSON quebrado e corpo que não é objeto também são recusados', () => {
    const script = new AppsScriptSandbox();
    expect(script.postRaw('{nao é json')).toEqual({ ok: false, error: 'invalid' });
    expect(script.post([1, 2])).toEqual({ ok: false, error: 'invalid' });
  });

  it('o aceite dos mentores não vale para a inscrição de participante (e vice-versa)', () => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody({}, { consentVersion: '2026-10-m1' }))).toEqual({
      ok: false,
      error: 'invalid',
    });
  });
});

describe('Apps Script · cadastro de mentores: duplicados e reenvio', () => {
  it('e-mail repetido e WhatsApp repetido são recusados, cada um com o seu código', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody());
    expect(script.post(otherMentor(2, { email: 'ana.mentora@exemplo.com' })).error).toBe('duplicate_email');
    expect(script.post(otherMentor(3, { whatsapp: '(63) 99999-0101' })).error).toBe('duplicate_whatsapp');
    expect(rowsOf(script)).toHaveLength(1);
  });

  it('cadastro cancelado libera o e-mail e o WhatsApp', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody());
    script.edit(mentors(script), 0, 'Status', 'cancelado');
    expect(
      script.post(otherMentor(2, { email: 'ana.mentora@exemplo.com', whatsapp: '(63) 99999-0101' })).ok,
    ).toBe(true);
    expect(rowsOf(script)).toHaveLength(2);
  });

  it('reenvio com a mesma chave devolve o mesmo protocolo e não duplica a linha', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(mentorBody({}, { idempotencyKey: KEY }));
    const again = script.post(mentorBody({}, { idempotencyKey: KEY }));
    expect(again.protocol).toBe(first.protocol);
    expect(rowsOf(script)).toHaveLength(1);
  });

  it('a resposta se perdeu e o cache já foi: a chave gravada na linha reconhece o envio', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(mentorBody({}, { idempotencyKey: KEY }));
    script.cache.store.clear();
    const again = script.post(mentorBody({}, { idempotencyKey: KEY }));
    expect(again).toEqual({ ok: true, protocol: first.protocol });
    expect(rowsOf(script)).toHaveLength(1);
  });

  it('a mesma chave com outro e-mail é outro envio', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody({}, { idempotencyKey: KEY }));
    expect(script.post(otherMentor(2)).ok).toBe(true);
    expect(rowsOf(script)).toHaveLength(2);
  });

  it('cada cadastro tem protocolo próprio', () => {
    const script = new AppsScriptSandbox();
    const protocols = [mentorBody(), otherMentor(2), otherMentor(3)].map(
      (body) => script.post(body).protocol,
    );
    expect(new Set(protocols).size).toBe(3);
  });

  it('o limite de envios por e-mail vale para os mentores também', () => {
    const script = new AppsScriptSandbox();
    const results = Array.from({ length: 12 }, (_, i) =>
      script.post(
        mentorBody({}, { idempotencyKey: `00000000-0000-4000-9000-${String(i).padStart(12, '0')}` }),
      ),
    );
    expect(results.some((r) => r.error === 'rate-limited')).toBe(true);
  });
});

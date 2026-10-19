import { describe, expect, it } from 'vitest';
import { ParticipantRegistration, Phone, ShortText } from '@domain/index';
import { participantInput } from '../helpers/fixtures';

const create = (overrides: Parameters<typeof participantInput>[0] = {}) =>
  ParticipantRegistration.create(participantInput(overrides));

const errorsOf = (overrides: Parameters<typeof participantInput>[0] = {}) => {
  const result = create(overrides);
  return result.ok ? {} : result.error;
};

describe('Phone (WhatsApp)', () => {
  it.each([
    ['(63) 99999-1234', '(63) 99999-1234'],
    ['63999991234', '(63) 99999-1234'],
    ['+55 63 99999-1234', '(63) 99999-1234'],
    ['55 (63) 99999 1234', '(63) 99999-1234'],
    ['063 99999-1234', '(63) 99999-1234'],
    ['(63) 3212-3456', '(63) 3212-3456'],
  ])('aceita %s e guarda %s', (raw, value) => {
    const phone = Phone.create(raw);
    expect(phone.ok && phone.value.value).toBe(value);
  });

  it('a chave de comparação são só os dígitos, com ou sem o 55', () => {
    expect(Phone.digitsOf('+55 (63) 99999-1234')).toBe(Phone.digitsOf('63 99999 1234'));
  });

  it.each([
    ['', 'Informe o WhatsApp com DDD.'],
    ['99999-1234', 'Confira o número'],
    ['(06) 99999-1234', 'Confira o número'],
    ['(60) 99999-1234', 'Confira o número'],
    // celular com 9 dígitos precisa começar com 9
    ['(63) 89999-1234', 'Confira o número'],
    // fixo com 8 dígitos começa de 2 a 5
    ['(63) 9212-3456', 'Confira o número'],
    ['(63) 99999-12345', 'Confira o número'],
  ])('recusa %j', (raw, message) => {
    const phone = Phone.create(raw);
    expect(phone.ok).toBe(false);
    if (!phone.ok) expect(phone.error).toContain(message);
  });
});

describe('ShortText', () => {
  const rule = { label: 'o curso', min: 3, max: 10 };

  it('tira espaço sobrando', () => {
    const text = ShortText.create('  Eng   Soft ', rule);
    expect(text.ok && text.value.value).toBe('Eng Soft');
  });

  it('recusa vazio, curto, longo e símbolo de código', () => {
    expect(ShortText.create('   ', rule)).toEqual({ ok: false, error: 'Informe o curso.' });
    expect(ShortText.create('ab', rule).ok).toBe(false);
    expect(ShortText.create('abcdefghijk', rule).ok).toBe(false);
    expect(ShortText.create('<script>', rule).ok).toBe(false);
    expect(ShortText.create('C:\\cursos', rule).ok).toBe(false);
  });
});

describe('ParticipantRegistration', () => {
  it('aluna da UniCatólica: guarda curso, período e matrícula, com a instituição preenchida', () => {
    const result = create({ email: ' ANA@Exemplo.com ', whatsapp: '63999991234', institution: 'Outra' });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.data).toEqual({
      name: 'Ana Souza',
      email: 'ana@exemplo.com',
      whatsapp: '(63) 99999-1234',
      profile: 'unicatolica',
      institution: 'UniCatólica',
      course: 'Engenharia de Software',
      period: 3,
      studentId: '2024100123',
      area: '',
      adult: true,
    });
    expect(result.value.needsGuardianConsent).toBe(false);
  });

  it('matrícula é opcional na UniCatólica, mas se vier precisa ser válida', () => {
    expect(create({ studentId: '' }).ok).toBe(true);
    expect(errorsOf({ studentId: 'a b' })).toHaveProperty('studentId');
  });

  it('outra instituição: instituição opcional, curso e período obrigatórios, matrícula ignorada', () => {
    const result = create({ profile: 'other-institution', institution: '', studentId: 'qualquer coisa ?' });
    expect(result.ok && result.value.data).toMatchObject({ institution: '', studentId: '', period: 3 });
    const errors = errorsOf({ profile: 'other-institution', course: '', period: '' });
    expect(Object.keys(errors).sort()).toEqual(['course', 'period']);
    expect(errorsOf({ profile: 'other-institution', institution: 'x' })).toHaveProperty('institution');
  });

  it('já formado: curso de formação e área; período e instituição não valem', () => {
    const result = create({ profile: 'graduate', area: 'data-ai', period: '', institution: 'Faculdade X' });
    expect(result.ok && result.value.data).toMatchObject({
      course: 'Engenharia de Software',
      area: 'data-ai',
      period: 0,
      institution: '',
      studentId: '',
    });
    expect(errorsOf({ profile: 'graduate', course: '' })['course']).toBe(
      'Informe o curso em que você se formou.',
    );
    expect(errorsOf({ profile: 'graduate', area: '' })).toHaveProperty('area');
  });

  it('não estuda: só a área é pedida; curso digitado antes de trocar de opção é descartado', () => {
    const result = create({ profile: 'self-taught', area: 'security', course: '', period: '' });
    expect(result.ok && result.value.data).toMatchObject({ course: '', period: 0, area: 'security' });
    expect(create({ profile: 'self-taught', area: 'security', course: 'x' }).ok).toBe(true);
    expect(errorsOf({ profile: 'self-taught', area: '' })).toHaveProperty('area');
  });

  it('período fora de 1 a 10 é recusado', () => {
    expect(errorsOf({ period: '0' })).toHaveProperty('period');
    expect(errorsOf({ period: '11' })).toHaveProperty('period');
    expect(errorsOf({ period: '2.5' })).toHaveProperty('period');
  });

  it('menor de idade entra, mas precisa da autorização do responsável', () => {
    const result = create({ adult: 'no' });
    expect(result.ok && result.value.needsGuardianConsent).toBe(true);
  });

  it('formulário vazio acusa cada campo obrigatório, e só eles', () => {
    const errors = errorsOf({
      name: '',
      email: '',
      whatsapp: '',
      profile: '',
      course: '',
      period: '',
      studentId: '',
      adult: '',
      acceptedTerms: false,
    });
    expect(Object.keys(errors).sort()).toEqual([
      'acceptedTerms',
      'adult',
      'email',
      'name',
      'profile',
      'whatsapp',
    ]);
  });

  it('perfil fora da lista não passa', () => {
    expect(errorsOf({ profile: 'admin' as never })).toHaveProperty('profile');
  });
});

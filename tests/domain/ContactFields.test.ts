import { describe, expect, it } from 'vitest';
import { Email, PersonName, Phone } from '@domain/index';

const valueOf = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T | string =>
  r.ok ? r.value : r.error;

describe('Email', () => {
  it('normaliza caixa e espaços', () => {
    const r = Email.create('  Ana.Souza@Exemplo.COM ');
    expect(r.ok && r.value.value).toBe('ana.souza@exemplo.com');
  });

  it.each(['', 'ana', 'ana@exemplo', 'ana @exemplo.com', `${'a'.repeat(120)}@x.com`])(
    'rejeita "%s"',
    (raw) => {
      expect(Email.create(raw).ok).toBe(false);
    },
  );

  it('pede o e-mail quando vazio', () => {
    expect(valueOf(Email.create('  '))).toBe('Informe o e-mail.');
  });
});

describe('PersonName', () => {
  it('exige nome e sobrenome', () => {
    expect(valueOf(PersonName.create('Ana'))).toBe('Use nome e sobrenome.');
    expect(valueOf(PersonName.create(''))).toBe('Informe o nome completo.');
  });

  it('junta espaços repetidos', () => {
    const r = PersonName.create('  Ana    Souza ');
    expect(r.ok && r.value.value).toBe('Ana Souza');
  });
});

describe('Phone', () => {
  it.each([
    ['(63) 99999-1234', '63999991234'],
    ['+55 63 99999-1234', '63999991234'],
    ['63 3214-5678', '6332145678'],
  ])('aceita %s', (raw, digits) => {
    const r = Phone.create(raw);
    expect(r.ok && r.value.digits).toBe(digits);
  });

  it('formata celular e fixo', () => {
    const mobile = Phone.create('63999991234');
    const landline = Phone.create('6332145678');
    expect(mobile.ok && mobile.value.formatted).toBe('(63) 99999-1234');
    expect(landline.ok && landline.value.formatted).toBe('(63) 3214-5678');
  });

  it.each(['123', '00 99999-1234', ''])('rejeita "%s"', (raw) => {
    expect(Phone.create(raw).ok).toBe(false);
  });
});

import { describe, expect, it } from 'vitest';
import { Email, FullName, StudentId, TeamMember } from '@domain/index';

const valueOf = <T>(r: { ok: true; value: T } | { ok: false; error: string }): T | string =>
  r.ok ? r.value : r.error;

describe('Email', () => {
  it('normaliza caixa e espaços', () => {
    const r = Email.create('  Ana.Souza@Exemplo.COM ');
    expect(r.ok && r.value.value).toBe('ana.souza@exemplo.com');
  });

  it.each(['ana', 'ana@exemplo', 'ana @exemplo.com', `${'a'.repeat(120)}@x.com`])('rejeita "%s"', (raw) => {
    expect(valueOf(Email.create(raw))).toBe('Confira o e-mail: algo como nome@exemplo.com.');
  });

  it('pede o e-mail quando vazio', () => {
    expect(valueOf(Email.create('  '))).toBe('Informe o e-mail.');
  });
});

describe('FullName', () => {
  it.each(['Ana Souza', 'Li Wu', "Ana D'Ávila", 'Maria-Clara de Souza Lima'])('aceita "%s"', (raw) => {
    expect(FullName.create(raw).ok).toBe(true);
  });

  it.each([
    ['', 'Informe o nome completo.'],
    ['Ana', 'Escreva nome e sobrenome.'],
    ['Ana S.', 'Escreva nome e sobrenome.'],
    ['A B', 'Escreva nome e sobrenome.'],
    ['Ana Souza 2', 'Use só letras no nome.'],
    ['ana@souza.com', 'Use só letras no nome.'],
    [`Ana ${'Souza'.repeat(16)}`, 'Use até 80 caracteres.'],
  ])('"%s": %s', (raw, message) => {
    expect(valueOf(FullName.create(raw))).toBe(message);
  });

  it('junta espaços repetidos', () => {
    const r = FullName.create('  Ana    Souza ');
    expect(r.ok && r.value.value).toBe('Ana Souza');
  });
});

describe('StudentId (matrícula)', () => {
  it.each([
    ['2024100123', '2024100123'],
    [' ra-2023.044 ', 'RA-2023.044'],
    ['2025/0007', '2025/0007'],
    ['0012', '0012'],
  ])('aceita "%s" como %s', (raw, value) => {
    const r = StudentId.create(raw);
    expect(r.ok && r.value.value).toBe(value);
  });

  it.each([
    ['', 'Informe a matrícula.'],
    ['123', 'A matrícula tem de 4 a 20 caracteres.'],
    ['1'.repeat(21), 'A matrícula tem de 4 a 20 caracteres.'],
    ['2024 100', 'Use só letras, números, ponto, hífen ou barra.'],
    ['2024#100', 'Use só letras, números, ponto, hífen ou barra.'],
    ['ção123', 'Use só letras, números, ponto, hífen ou barra.'],
  ])('"%s": %s', (raw, message) => {
    expect(valueOf(StudentId.create(raw))).toBe(message);
  });
});

describe('TeamMember', () => {
  it('junta os três campos já normalizados', () => {
    const r = TeamMember.create({ name: ' Ana  Souza', studentId: 'ra-1234', email: 'ANA@exemplo.com' });
    expect(r.ok && r.value.toJSON()).toEqual({
      name: 'Ana Souza',
      studentId: 'RA-1234',
      email: 'ana@exemplo.com',
    });
  });

  it('devolve o erro de cada campo que falhou', () => {
    const r = TeamMember.create({ name: 'Ana', studentId: '', email: 'ana@exemplo.com' });
    expect(!r.ok && r.error).toEqual({
      name: 'Escreva nome e sobrenome.',
      studentId: 'Informe a matrícula.',
    });
  });
});

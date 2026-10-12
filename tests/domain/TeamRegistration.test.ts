import { describe, expect, it } from 'vitest';
import { DomainError, TeamRegistration } from '@domain/index';
import { MEMBER_ANA, MEMBER_BRUNO, TEAM_SIZE, member, teamInput } from '../helpers/fixtures';

describe('TeamRegistration', () => {
  it('cria a equipe válida; o integrante 1 é o contato', () => {
    const r = TeamRegistration.create(teamInput(), TEAM_SIZE);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.size).toBe(2);
    expect(r.value.teamName).toBe('Bug Busters');
    expect(r.value.contact.email).toBe('ana@exemplo.com');
    expect(r.value.members.map((m) => m.studentId)).toEqual(['2024100123', '2024100456']);
  });

  it('barra equipe menor que o mínimo (todo mundo conta, inclusive o contato)', () => {
    const r = TeamRegistration.create(teamInput({ members: [MEMBER_ANA] }), TEAM_SIZE);
    expect(!r.ok && r.error['members']).toBe('A equipe precisa de pelo menos 2 integrantes.');
  });

  it('barra equipe maior que o máximo', () => {
    const r = TeamRegistration.create(teamInput({ members: [1, 2, 3, 4, 5, 6].map(member) }), TEAM_SIZE);
    expect(!r.ok && r.error['members']).toBe('A equipe pode ter no máximo 5 integrantes.');
  });

  it('todos os campos de cada integrante são obrigatórios, com o erro no caminho do campo', () => {
    const blank = { name: '', studentId: '', email: '' };
    const r = TeamRegistration.create(teamInput({ members: [MEMBER_ANA, blank] }), TEAM_SIZE);
    expect(!r.ok && r.error).toMatchObject({
      'members.1.name': 'Informe o nome completo.',
      'members.1.studentId': 'Informe a matrícula.',
      'members.1.email': 'Informe o e-mail.',
    });
  });

  it('e-mail repetido dentro da equipe aponta o campo repetido e o integrante original', () => {
    const r = TeamRegistration.create(
      teamInput({ members: [MEMBER_ANA, { ...MEMBER_BRUNO, email: 'ANA@exemplo.com' }] }),
      TEAM_SIZE,
    );
    expect(!r.ok && r.error).toEqual({ 'members.1.email': 'Esse e-mail já está no integrante 1.' });
  });

  it('matrícula repetida (sem diferenciar caixa) também', () => {
    const members = [
      { ...MEMBER_ANA, studentId: 'ra-1234' },
      MEMBER_BRUNO,
      { ...member(3), studentId: 'RA-1234' },
    ];
    const r = TeamRegistration.create(teamInput({ members }), TEAM_SIZE);
    expect(!r.ok && r.error).toEqual({ 'members.2.studentId': 'Essa matrícula já está no integrante 1.' });
  });

  it('valida o nome da equipe e exige a foto', () => {
    const r = TeamRegistration.create(teamInput({ teamName: 'x', teamImage: null }), TEAM_SIZE);
    expect(!r.ok && r.error['teamName']).toContain('de 2 a 40');
    expect(!r.ok && r.error['teamImage']).toBeDefined();
  });

  it('exige o aceite do regulamento', () => {
    const r = TeamRegistration.create(teamInput({ acceptedTerms: false }), TEAM_SIZE);
    expect(!r.ok && r.error['acceptedTerms']).toBeDefined();
  });

  it('não aceita regra de tamanho impossível', () => {
    expect(() => TeamRegistration.create(teamInput(), { min: 0, max: 3 })).toThrow(DomainError);
    expect(() => TeamRegistration.create(teamInput(), { min: 4, max: 3 })).toThrow(DomainError);
  });
});

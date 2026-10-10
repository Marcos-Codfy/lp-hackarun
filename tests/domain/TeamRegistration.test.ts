import { describe, expect, it } from 'vitest';
import { DomainError, TeamRegistration } from '@domain/index';
import { TEAM_SIZE, teamInput } from '../helpers/fixtures';

const member = (n: number) => ({ name: `Pessoa Numero${n}`, email: `p${n}@exemplo.com`, course: '' });

describe('TeamRegistration', () => {
  it('cria uma equipe válida e formata o telefone', () => {
    const r = TeamRegistration.create(
      teamInput({ leader: { ...teamInput().leader, phone: '63999991234' } }),
      TEAM_SIZE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.size).toBe(2);
    expect(r.value.teamName).toBe('Bug Busters');
    expect(r.value.leader.phone).toBe('(63) 99999-1234');
  });

  it('barra equipe menor que o mínimo (o líder conta como 1)', () => {
    const r = TeamRegistration.create(teamInput({ members: [] }), TEAM_SIZE);
    expect(!r.ok && r.error['members']).toContain('pelo menos 2');
  });

  it('barra equipe maior que o máximo', () => {
    const r = TeamRegistration.create(teamInput({ members: [1, 2, 3, 4, 5].map(member) }), TEAM_SIZE);
    expect(!r.ok && r.error['members']).toContain('no máximo 5');
  });

  it('ignora linhas de integrante totalmente vazias', () => {
    const blank = { name: ' ', email: '', course: 'ES' };
    const r = TeamRegistration.create(teamInput({ members: [blank, member(1)] }), TEAM_SIZE);
    expect(r.ok && r.value.members).toHaveLength(1);
  });

  it('acusa e-mail repetido dentro da equipe', () => {
    const r = TeamRegistration.create(
      teamInput({ members: [{ name: 'Bruno Lima', email: 'ANA@exemplo.com', course: '' }] }),
      TEAM_SIZE,
    );
    expect(!r.ok && r.error['members']).toBe('Tem e-mail repetido na equipe.');
  });

  it('aponta o erro no caminho do campo do integrante', () => {
    const r = TeamRegistration.create(
      teamInput({ members: [{ name: 'Bruno', email: 'x', course: '' }] }),
      TEAM_SIZE,
    );
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.error['members.0.name']).toBeDefined();
    expect(r.error['members.0.email']).toBe('E-mail inválido.');
  });

  it('modo solo ignora nome da equipe e integrantes', () => {
    const r = TeamRegistration.create(
      teamInput({ mode: 'solo', teamName: '', members: [member(1), member(2)] }),
      TEAM_SIZE,
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.value.teamName).toBeNull();
    expect(r.value.members).toEqual([]);
    expect(r.value.size).toBe(1);
  });

  it('valida o nome da equipe só no modo equipe', () => {
    const r = TeamRegistration.create(teamInput({ teamName: 'x' }), TEAM_SIZE);
    expect(!r.ok && r.error['teamName']).toContain('de 2 a 40');
  });

  it('exige o aceite do regulamento', () => {
    const r = TeamRegistration.create(teamInput({ acceptedTerms: false }), TEAM_SIZE);
    expect(!r.ok && r.error['acceptedTerms']).toBeDefined();
  });

  it('corta a necessidade de acessibilidade em 500 caracteres', () => {
    const r = TeamRegistration.create(teamInput({ accessibilityNeeds: 'a'.repeat(900) }), TEAM_SIZE);
    expect(r.ok && r.value.accessibilityNeeds).toHaveLength(500);
  });

  it('não aceita regra de tamanho impossível', () => {
    expect(() => TeamRegistration.create(teamInput(), { min: 0, max: 3 })).toThrow(DomainError);
    expect(() => TeamRegistration.create(teamInput(), { min: 4, max: 3 })).toThrow(DomainError);
  });
});

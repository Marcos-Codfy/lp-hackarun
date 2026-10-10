import { describe, expect, it } from 'vitest';
import { DomainError, ScoringRule, Slots, TeamName, TimeSlot } from '@domain/index';

describe('Slots', () => {
  it.each([
    [null, 3, 'unknown'],
    [10, 0, 'plenty'],
    [10, 5, 'filling'],
    [20, 17, 'last'],
    [10, 10, 'full'],
    [10, 12, 'full'],
  ] as const)('capacidade %s com %s ocupadas = %s', (capacity, taken, level) => {
    expect(Slots.create(capacity, taken).level).toBe(level);
  });

  it('calcula as vagas restantes sem passar de zero', () => {
    expect(Slots.create(10, 4).remaining).toBe(6);
    expect(Slots.create(10, 14).remaining).toBe(0);
    expect(Slots.create(null, 4).remaining).toBeNull();
  });

  it('rejeita números impossíveis', () => {
    expect(() => Slots.create(10, -1)).toThrow(DomainError);
    expect(() => Slots.create(0, 0)).toThrow(DomainError);
  });
});

describe('TimeSlot', () => {
  it('aceita início em aberto (só o fim)', () => {
    const slot = TimeSlot.create(null, '15:00', 'Manhã');
    expect(slot.hasOpenStart).toBe(true);
    expect(slot.startHint).toBe('Manhã');
  });

  it.each([
    ['25:00', '26:00'],
    ['19:00', '18:00'],
    ['19:00', '19:00'],
    ['7:00', '09:00'],
  ])('rejeita %s -> %s', (start, end) => {
    expect(() => TimeSlot.create(start, end)).toThrow(DomainError);
  });

  it('precisa de pelo menos início ou fim', () => {
    expect(() => TimeSlot.create(null, null)).toThrow(DomainError);
  });
});

describe('ScoringRule', () => {
  const criteria = [
    { key: 'correctness', label: 'Solução', points: 60 },
    { key: 'teamwork', label: 'Equipe', points: 40 },
  ];

  it('exige que a soma dos critérios feche com o máximo', () => {
    expect(() => ScoringRule.create(90, criteria)).toThrow(DomainError);
    expect(ScoringRule.create(100, criteria).maxPoints).toBe(100);
  });

  it('calcula a fatia de cada critério', () => {
    const rule = ScoringRule.create(100, criteria);
    expect(rule.shareOf('correctness')).toBe(0.6);
    expect(rule.shareOf('inexistente')).toBe(0);
  });
});

describe('TeamName', () => {
  it('limpa espaços e gera chave de busca sem acento', () => {
    const name = TeamName.create('  Café   Com   Código ');
    expect(name.value).toBe('Café Com Código');
    expect(name.searchKey).toBe('cafe com codigo');
  });

  it('respeita os limites de tamanho', () => {
    expect(() => TeamName.create('A')).toThrow(DomainError);
    expect(() => TeamName.create('x'.repeat(41))).toThrow(DomainError);
    expect(TeamName.create('x'.repeat(40)).value).toHaveLength(40);
  });
});

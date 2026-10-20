// inscrições sem limite de vagas por enquanto: o event.json não define capacidade e nenhum texto anuncia número
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import eventData from '@infrastructure/content/event.json';
import faqData from '@infrastructure/content/faq.json';
import type { RawEvent, RawFaqItem } from '@infrastructure/content/schema';
import { EventMapper } from '@infrastructure/mappers/EventMapper';
import { teamDrawSteps } from '@presentation/formatters/TeamDrawCopy';

describe('inscrições sem limite de vagas', () => {
  const { capacity, remaining } = EventMapper.toDomain(eventData as RawEvent).registration.slots;

  it('o event.json não define capacidade', () => {
    expect(capacity).toBeNull();
    expect(remaining).toBeNull();
  });

  it('a etapa de inscrição do sorteio e o FAQ não anunciam número de vagas', () => {
    const slots = { capacity, taken: 0, remaining, level: 'unknown' } as const;
    expect(teamDrawSteps({ slots, teamSize: { min: 4, max: 5 } })[0]?.text).not.toMatch(/vagas/);
    expect((faqData as RawFaqItem[]).map((f) => f.answer).join(' ')).not.toMatch(/\d+\s+vagas/);
  });
});

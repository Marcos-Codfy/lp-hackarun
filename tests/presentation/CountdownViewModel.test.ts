import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GetCountdown } from '@application/index';
import { SystemClock } from '@infrastructure/clock/SystemClock';
import { CountdownViewModel } from '@presentation/view-models/countdown/CountdownViewModel';
import {
  milestoneSentence,
  milestoneTag,
  formatHour,
} from '@presentation/view-models/countdown/milestoneText';
import { MILESTONES } from '../helpers/fixtures';

const create = () => {
  const clock = new SystemClock();
  return new CountdownViewModel(new GetCountdown(clock, MILESTONES), clock);
};

describe('CountdownViewModel', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('desce um segundo por tick', () => {
    vi.setSystemTime(new Date('2026-11-11T18:59:50.500-03:00'));
    const vm = create();
    vm.start();
    expect(vm.state.value.seconds).toBe(9);
    // o timer alinha logo depois da virada do segundo (+5ms de folga)
    vi.advanceTimersByTime(510);
    expect(vm.state.value.seconds).toBe(8);
    vi.advanceTimersByTime(1000);
    expect(vm.state.value.seconds).toBe(7);
    vm.stop();
  });

  it('notifica uma vez por segundo, não a cada timer', () => {
    vi.setSystemTime(new Date('2026-11-11T18:00:00.200-03:00'));
    const vm = create();
    const listener = vi.fn();
    vm.state.subscribe(listener, { immediate: false });
    vm.start();
    vi.advanceTimersByTime(3000);
    expect(listener).toHaveBeenCalledTimes(3);
    vm.stop();
  });

  it('começando em segundo cheio não pula dígito', () => {
    vi.setSystemTime(new Date('2026-11-11T18:59:50.000-03:00'));
    const vm = create();
    vm.start();
    expect(vm.state.value.seconds).toBe(10);
    vi.advanceTimersByTime(10);
    expect(vm.state.value.seconds).toBe(9);
    vm.stop();
  });

  it('troca de marco sozinho quando a largada passa', () => {
    vi.setSystemTime(new Date('2026-11-11T18:59:58-03:00'));
    const vm = create();
    vm.start();
    expect(vm.state.value.key).toBe('kickoff');
    vi.advanceTimersByTime(3000);
    expect(vm.state.value.key).toBe('submission');
    expect(vm.state.value.label).toBe('Entrega final em');
    vm.stop();
  });

  it('para de contar quando acaba tudo', () => {
    vi.setSystemTime(new Date('2026-11-14T17:59:58-03:00'));
    const vm = create();
    vm.start();
    vi.advanceTimersByTime(4000);
    expect(vm.state.value.isOver).toBe(true);
    expect(vm.isRunning).toBe(false);
  });
});

describe('milestoneText', () => {
  it('monta a frase estática do leitor de tela no fuso do evento', () => {
    expect(milestoneSentence('O HackaRun começa em', '2026-11-11T22:00:00.000Z')).toBe(
      'O HackaRun começa em 11 de novembro de 2026, às 19h.',
    );
  });

  it('formata hora quebrada e a etiqueta curta', () => {
    expect(formatHour('2026-11-14T18:30:00.000Z')).toBe('15h30');
    expect(milestoneTag('2026-11-14T18:00:00.000Z')).toBe('14.11 · 15H');
    expect(milestoneTag(null)).toBe('FIM DE JOGO');
  });
});

// HUD da corrida: o contador de checkpoints não pode parecer uma data (a página toda usa dd/mm)
import { describe, expect, it } from 'vitest';
import { HudViewModel, formatCheckpoint } from '@presentation/view-models/hud/HudViewModel';

describe('formatCheckpoint', () => {
  it('escreve "01 de 11 · LARGADA", sem barra entre os números', () => {
    expect(formatCheckpoint({ index: 0, total: 11, label: 'Largada' })).toBe('01 de 11 · LARGADA');
    expect(formatCheckpoint({ index: 4, total: 11, label: 'Programação' })).toBe('05 de 11 · PROGRAMAÇÃO');
    expect(formatCheckpoint({ index: 4, total: 11, label: 'Programação' })).not.toMatch(/\d\/\d/);
  });
});

describe('HudViewModel', () => {
  it('troca o checkpoint só quando a seção muda e ignora índice fora da lista', () => {
    const vm = new HudViewModel(['Largada', 'Sobre', 'Missões']);
    const seen: string[] = [];
    vm.state.subscribe((state) => seen.push(formatCheckpoint(state)));
    vm.enter(2);
    vm.enter(2);
    vm.enter(9);
    expect(seen.at(-1)).toBe('03 de 03 · MISSÕES');
    expect(vm.state.value.index).toBe(2);
  });

  it('progresso fica entre 0 e 1, arredondado', () => {
    const vm = new HudViewModel(['Largada']);
    vm.setProgress(1.4);
    expect(vm.state.value.progress).toBe(1);
    vm.setProgress(0.12345);
    expect(vm.state.value.progress).toBe(0.123);
  });
});

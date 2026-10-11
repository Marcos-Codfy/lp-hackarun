import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { PreferenceStore } from '@application/ports/PreferenceStore';
import type { AppEvents } from '@presentation/app/AppEvents';
import { MotionPreferenceViewModel } from '@presentation/view-models/motion/MotionPreferenceViewModel';

class FakeStore implements PreferenceStore {
  readonly data = new Map<string, string>();
  get(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  set(key: string, value: string): void {
    this.data.set(key, value);
  }
  remove(key: string): void {
    this.data.delete(key);
  }
}

function setup(options: { saved?: string; reducedMotion?: boolean } = {}) {
  const store = new FakeStore();
  if (options.saved) store.set('motion', options.saved);
  const bus = new EventBus<AppEvents>();
  const changed = vi.fn();
  bus.on('motion:paused', changed);
  const vm = new MotionPreferenceViewModel({ store, bus, reducedMotion: options.reducedMotion ?? false });
  return { vm, store, changed };
}

describe('MotionPreferenceViewModel', () => {
  it('começa rodando quando não há preferência salva', () => {
    const { vm } = setup();
    expect(vm.paused.value).toBe(false);
    expect(vm.locked).toBe(false);
    expect(vm.hint(vm.paused.value)).toBe('Pausar animações');
  });

  it('pausar salva, avisa o bus e troca o texto da ação', () => {
    const { vm, store, changed } = setup();
    vm.toggle();
    expect(vm.paused.value).toBe(true);
    expect(store.get('motion')).toBe('paused');
    expect(changed).toHaveBeenCalledWith({ paused: true });
    expect(vm.hint(true)).toBe('Retomar animações');
  });

  it('retomar volta a rodar e grava a escolha', () => {
    const { vm, store, changed } = setup({ saved: 'paused' });
    expect(vm.paused.value).toBe(true);
    vm.toggle();
    expect(vm.paused.value).toBe(false);
    expect(store.get('motion')).toBe('running');
    expect(changed).toHaveBeenLastCalledWith({ paused: false });
  });

  it('mesmo estado não emite de novo', () => {
    const { vm, changed } = setup();
    vm.setPaused(false);
    vm.setPaused(true);
    vm.setPaused(true);
    expect(changed).toHaveBeenCalledTimes(1);
  });

  it('valor desconhecido no storage conta como rodando', () => {
    const { vm } = setup({ saved: 'qualquer' });
    expect(vm.paused.value).toBe(false);
  });

  it('reduced motion: já nasce pausado, travado e sem gravar nada', () => {
    const { vm, store, changed } = setup({ reducedMotion: true, saved: 'running' });
    expect(vm.paused.value).toBe(true);
    expect(vm.locked).toBe(true);
    vm.toggle();
    vm.setPaused(false);
    expect(vm.paused.value).toBe(true);
    expect(store.get('motion')).toBe('running');
    expect(changed).not.toHaveBeenCalled();
    expect(vm.hint(true)).toBe('Animações reduzidas pelo sistema');
  });
});

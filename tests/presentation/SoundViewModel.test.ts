import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import { SoundViewModel } from '@presentation/view-models/sound/SoundViewModel';

function setup(options: { supported?: boolean; saved?: string } = {}) {
  const store = new MemoryPreferenceStore();
  if (options.saved) store.set('sound', options.saved);
  const engine = {
    isSupported: options.supported ?? true,
    unlock: vi.fn(async () => true),
    suspend: vi.fn(),
  };
  const cue = { play: vi.fn(async () => undefined), preload: vi.fn() };
  const bus = new EventBus<AppEvents>();
  const changed = vi.fn();
  bus.on('sound:changed', changed);
  return { vm: new SoundViewModel({ store, engine, cue, bus }), store, engine, cue, changed };
}

describe('SoundViewModel', () => {
  it('começa desligado e não toca nada', () => {
    const { vm, cue } = setup();
    expect(vm.enabled.value).toBe(false);
    vm.playCue();
    expect(cue.play).not.toHaveBeenCalled();
  });

  it('ligar destrava o áudio na hora do clique, salva e avisa', async () => {
    const { vm, engine, store, changed, cue } = setup();
    vm.toggle();
    expect(engine.unlock).toHaveBeenCalledTimes(1);
    expect(store.get('sound')).toBe('on');
    expect(changed).toHaveBeenCalledWith({ enabled: true });
    await Promise.resolve();
    await Promise.resolve();
    expect(cue.preload).toHaveBeenCalled();
    vm.playCue();
    expect(cue.play).toHaveBeenCalledTimes(1);
  });

  it('desligar suspende o contexto', () => {
    const { vm, engine, store } = setup({ saved: 'on' });
    expect(vm.enabled.value).toBe(true);
    vm.toggle();
    expect(engine.suspend).toHaveBeenCalled();
    expect(store.get('sound')).toBe('off');
  });

  it('preferência salva destrava só no primeiro gesto', () => {
    const { vm, engine } = setup({ saved: 'on' });
    expect(engine.unlock).not.toHaveBeenCalled();
    vm.resumeFromGesture();
    expect(engine.unlock).toHaveBeenCalledTimes(1);
  });

  it('sem Web Audio não liga', () => {
    const { vm, changed } = setup({ supported: false, saved: 'on' });
    expect(vm.enabled.value).toBe(false);
    vm.toggle();
    expect(vm.enabled.value).toBe(false);
    expect(changed).not.toHaveBeenCalled();
  });
});

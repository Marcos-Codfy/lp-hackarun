import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import { SoundViewModel } from '@presentation/view-models/sound/SoundViewModel';
import { ChargeCueGate } from '@presentation/view-models/sound/ChargeCueGate';
import { SoundBusBinder } from '@presentation/views/SoundBusBinder';
import { revealFrame } from '@presentation/views/registration/ProtocolReveal';

function setup(saved = 'on') {
  const store = new MemoryPreferenceStore();
  store.set('sound', saved);
  const engine = { isSupported: true, unlock: vi.fn(async () => true), suspend: vi.fn() };
  const cue = { play: vi.fn(async () => undefined) };
  const typing = { play: vi.fn(), preload: vi.fn() };
  const bus = new EventBus<AppEvents>();
  const vm = new SoundViewModel({ store, engine, cue, typing, bus });
  new SoundBusBinder(bus, vm).mount();
  return { bus, vm, cue, typing };
}

describe('ChargeCueGate', () => {
  it('dispara uma vez por carga', () => {
    const gate = new ChargeCueGate();
    expect(gate.fire()).toBe(true);
    expect(gate.fire()).toBe(false);
    gate.arm();
    expect(gate.fire()).toBe(true);
  });
});

describe('SoundBusBinder', () => {
  it('toca o cue exatamente no charged, uma vez por carga', () => {
    const { bus, cue } = setup();
    bus.emit('experience:charging', { durationMs: 1500 });
    expect(cue.play).not.toHaveBeenCalled();
    bus.emit('experience:charged', undefined);
    bus.emit('experience:charged', undefined);
    expect(cue.play).toHaveBeenCalledTimes(1);
    // saiu e voltou: nova carga, novo som
    bus.emit('experience:charging', { durationMs: 1500 });
    bus.emit('experience:charged', undefined);
    expect(cue.play).toHaveBeenCalledTimes(2);
  });

  it('com o som desligado nada toca', () => {
    const { bus, cue, typing } = setup('off');
    bus.emit('experience:charging', { durationMs: 0 });
    bus.emit('experience:charged', undefined);
    bus.emit('ui:type', undefined);
    expect(cue.play).not.toHaveBeenCalled();
    expect(typing.play).not.toHaveBeenCalled();
  });

  it('cada ui:type vira um clique quando o som está ligado', () => {
    const { bus, typing } = setup();
    bus.emit('ui:type', undefined);
    bus.emit('ui:type', undefined);
    expect(typing.play).toHaveBeenCalledTimes(2);
  });

  it('ligar o som pré-carrega os cliques também', async () => {
    const { vm, typing } = setup('off');
    vm.toggle();
    await Promise.resolve();
    await Promise.resolve();
    expect(typing.preload).toHaveBeenCalled();
  });
});

describe('revealFrame', () => {
  it('mostra n caracteres certos e um embaralhado na ponta', () => {
    expect(revealFrame('HR-26', 0, '#')).toBe('#');
    expect(revealFrame('HR-26', 2, '#')).toBe('HR#');
    expect(revealFrame('HR-26', 5, '#')).toBe('HR-26');
    expect(revealFrame('HR-26', 9, '#')).toBe('HR-26');
  });
});

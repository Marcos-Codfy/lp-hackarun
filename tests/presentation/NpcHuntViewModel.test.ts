import { describe, expect, it, vi } from 'vitest';
import { EventBus } from '@shared/core/EventBus';
import type { AppEvents } from '@presentation/app/AppEvents';
import { MemoryPreferenceStore } from '@infrastructure/storage/MemoryPreferenceStore';
import { NpcHuntViewModel } from '@presentation/view-models/npc/NpcHuntViewModel';

function setup(store = new MemoryPreferenceStore()) {
  const bus = new EventBus<AppEvents>();
  const found = vi.fn();
  bus.on('npc:found', found);
  return { vm: new NpcHuntViewModel({ store, bus }), store, found };
}

describe('NpcHuntViewModel', () => {
  it('marca, salva e avisa no bus', () => {
    const { vm, store, found } = setup();
    expect(vm.markFound('npc-1')).toBe(true);
    expect(vm.isFound('npc-1')).toBe(true);
    expect(store.get('npc-found')).toBe('["npc-1"]');
    expect(found).toHaveBeenCalledWith({ id: 'npc-1', found: 1, total: 3 });
  });

  it('o mesmo NPC não conta duas vezes', () => {
    const { vm, found } = setup();
    vm.markFound('npc-1');
    expect(vm.markFound('npc-1')).toBe(false);
    expect(vm.state.value.found).toHaveLength(1);
    expect(found).toHaveBeenCalledTimes(1);
  });

  it('achou os 3: libera o segredo', () => {
    const { vm } = setup();
    ['a', 'b'].forEach((id) => vm.markFound(id));
    expect(vm.state.value.allFound).toBe(false);
    vm.markFound('c');
    expect(vm.state.value).toMatchObject({ allFound: true, total: 3 });
    expect(vm.markFound('d')).toBe(false);
  });

  it('restaura do storage e ignora lixo', () => {
    const store = new MemoryPreferenceStore();
    store.set('npc-found', JSON.stringify(['a', 'a', 7, '', 'b']));
    expect(setup(store).vm.state.value.found).toEqual(['a', 'b']);
    store.set('npc-found', '{quebrado');
    expect(setup(store).vm.state.value.found).toEqual([]);
  });
});

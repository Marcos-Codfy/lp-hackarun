import { describe, expect, it, vi } from 'vitest';
import type { AppContext } from '@presentation/app/AppContext';
import { mountControllers } from '@presentation/controllers/mountControllers';

describe('mountControllers', () => {
  it('um passo por controlador; âncoras ficam com o AnchorNavigator do motion', () => {
    const boot = { add: vi.fn() };
    mountControllers({} as AppContext, boot);
    expect(boot.add.mock.calls.map(([name]) => name)).toEqual([
      'header',
      'day tabs',
      'missions rail',
      'faq hash',
      'nav spy',
      'aurora',
      'hud rail',
      'offscreen motion',
      'scroll motion',
    ]);
  });

  it('segunda chamada na mesma fila não monta em dobro', () => {
    const boot = { add: vi.fn() };
    mountControllers({} as AppContext, boot);
    mountControllers({} as AppContext, boot);
    expect(boot.add).toHaveBeenCalledTimes(9);
  });
});

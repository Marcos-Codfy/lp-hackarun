import { describe, expect, it } from 'vitest';
import { fillValid, setupForm as setup, windowClosingAt } from './formSetup';

describe('RegistrationFormViewModel · status no navegador', () => {
  it('build aberto, prazo já vencido: fecha ao montar e não envia', async () => {
    const { vm, gateway } = setup({ window: windowClosingAt('2026-10-31T23:59:00-03:00') });
    expect(vm.isOpen).toBe(true);
    vm.refreshAvailability();
    expect(vm.isOpen).toBe(false);
    fillValid(vm);
    await vm.submit();
    expect(gateway.calls).toHaveLength(0);
  });

  it('dentro do prazo continua aberto', () => {
    const { vm } = setup({ window: windowClosingAt('2026-11-08T23:59:00-03:00') });
    vm.refreshAvailability();
    expect(vm.isOpen).toBe(true);
  });

  it('vagas esgotadas na lista ao vivo também fecham', () => {
    const slots = { capacity: 3, taken: 1, remaining: 2, level: 'plenty' as const };
    const { vm } = setup({ window: { ...windowClosingAt('2026-11-08T23:59:00-03:00'), slots } });
    vm.refreshAvailability(2);
    expect(vm.isOpen).toBe(true);
    vm.refreshAvailability(3);
    expect(vm.isOpen).toBe(false);
  });

  it('o navegador nunca reabre o que o build fechou', () => {
    const { vm } = setup({ isOpen: false, window: windowClosingAt('2026-11-08T23:59:00-03:00') });
    vm.refreshAvailability();
    expect(vm.isOpen).toBe(false);
  });

  it('sem janela no caso de uso fica o status do build', () => {
    const { vm } = setup();
    vm.refreshAvailability();
    expect(vm.isOpen).toBe(true);
  });

  it('não fecha no meio de um envio', async () => {
    const { vm, clock } = setup({ window: windowClosingAt('2026-11-01T12:00:02Z') });
    fillValid(vm);
    const sending = vm.submit();
    clock.advance(10_000);
    vm.refreshAvailability();
    expect(vm.isOpen).toBe(true);
    await sending;
    expect(vm.state.value.status).toBe('success');
  });
});

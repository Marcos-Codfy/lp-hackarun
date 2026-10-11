import { vi } from 'vitest';
import { SubmitRegistration, type RegistrationWindowSnapshot } from '@application/index';
import { RegistrationFormViewModel } from '@presentation/view-models/registration/RegistrationFormViewModel';
import { FakeGateway, ManualClock, TEAM_SIZE } from '../../helpers/fixtures';

export interface FormSetupOptions {
  isOpen?: boolean;
  window?: RegistrationWindowSnapshot;
}

// VM de verdade em cima do caso de uso de verdade; só o gateway, o relógio e a chave são falsos
export function setupForm(options: FormSetupOptions = {}) {
  const clock = new ManualClock('2026-11-01T12:00:00Z');
  const gateway = new FakeGateway();
  // a espera do anti-robô passa no relógio falso, sem segurar o teste
  const sleep = vi.fn(async (ms: number) => clock.advance(ms));
  const submit = new SubmitRegistration({
    gateway,
    clock,
    teamSize: TEAM_SIZE,
    sleep,
    ...(options.window && { window: options.window }),
  });
  let keys = 0;
  const newKey = vi.fn(() => `chave-${String(++keys).padStart(4, '0')}`);
  const vm = new RegistrationFormViewModel({
    submit,
    teamSize: TEAM_SIZE,
    isOpen: options.isOpen ?? true,
    clock,
    newKey,
  });
  return { vm, gateway, clock, sleep, newKey };
}

export const windowClosingAt = (closesAt: string): RegistrationWindowSnapshot => ({
  endpoint: 'https://script.google.com/macros/s/abc/exec',
  closesAt,
  slots: { capacity: null, taken: 0, remaining: null, level: 'unknown' },
});

export function fillValidTeam(vm: RegistrationFormViewModel): void {
  vm.setText('teamName', 'Bug Busters');
  vm.setText('leader.name', 'Ana Souza');
  vm.setText('leader.email', 'ana@exemplo.com');
  vm.setText('leader.phone', '63999991234');
  vm.setText('leader.course', 'Engenharia de Software');
  vm.setText('members.0.name', 'Bruno Lima');
  vm.setText('members.0.email', 'bruno@exemplo.com');
  vm.setAcceptedTerms(true);
}

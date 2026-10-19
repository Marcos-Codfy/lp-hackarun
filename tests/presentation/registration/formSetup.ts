import { vi } from 'vitest';
import { SubmitRegistration, type RegistrationWindowSnapshot } from '@application/index';
import type { FieldPath } from '@presentation/view-models/registration/RegistrationFields';
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
  const vm = new RegistrationFormViewModel({ submit, isOpen: options.isOpen ?? true, clock, newKey });
  return { vm, gateway, clock, sleep, newKey };
}

export const windowClosingAt = (closesAt: string): RegistrationWindowSnapshot => ({
  endpoint: 'https://script.google.com/macros/s/abc/exec',
  closesAt,
  slots: { capacity: null, taken: 0, remaining: null, level: 'unknown' },
});

// aluna da UniCatólica com tudo preenchido (menos o aceite, que cada teste decide)
export const VALID_FIELDS: Partial<Record<FieldPath, string>> = {
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  whatsapp: '(63) 99999-1234',
  adult: 'yes',
  profile: 'unicatolica',
  course: 'Engenharia de Software',
  period: '3',
  studentId: '2024100123',
};

export function fillValid(vm: RegistrationFormViewModel, fields = VALID_FIELDS): void {
  for (const [path, value] of Object.entries(fields)) vm.setValue(path as FieldPath, value);
  vm.setAcceptedTerms(true);
}

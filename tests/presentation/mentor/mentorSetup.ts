import { vi } from 'vitest';
import { SubmitMentorRegistration } from '@application/index';
import { MentorFormViewModel } from '@presentation/view-models/mentor/MentorFormViewModel';
import type { MentorTextPath } from '@presentation/view-models/mentor/MentorFields';
import { ManualClock } from '../../helpers/fixtures';
import { FakeMentorGateway } from '../../helpers/mentorFixtures';

// VM de verdade em cima do caso de uso de verdade; só o gateway, o relógio e a chave são falsos
export function setupMentorForm(options: { isOpen?: boolean } = {}) {
  const clock = new ManualClock('2026-11-01T12:00:00Z');
  const gateway = new FakeMentorGateway();
  // a espera do anti-robô passa no relógio falso, sem segurar o teste
  const sleep = vi.fn(async (ms: number) => clock.advance(ms));
  const submit = new SubmitMentorRegistration({ gateway, clock, sleep });
  let keys = 0;
  const newKey = vi.fn(() => `chave-${String(++keys).padStart(4, '0')}`);
  const vm = new MentorFormViewModel({ submit, isOpen: options.isOpen ?? true, clock, newKey });
  return { vm, gateway, clock, sleep, newKey };
}

// egresso com tudo preenchido (menos o aceite, que cada teste decide)
export const VALID_TEXT: Partial<Record<MentorTextPath, string>> = {
  name: 'Ana Souza',
  email: 'ana.mentora@exemplo.com',
  whatsapp: '(63) 99999-0101',
  area: 'security',
  role: 'Analista de segurança',
  company: 'Empresa Exemplo',
  experience: '5-to-10',
  graduate: 'yes',
  course: 'Engenharia de Software',
  graduationYear: '2019',
  format: 'in-person',
  mode: 'either',
};

export function fillValidMentor(vm: MentorFormViewModel, fields = VALID_TEXT): void {
  for (const [path, value] of Object.entries(fields)) vm.setValue(path as MentorTextPath, value);
  vm.setDays(['13', '14']);
  vm.setFlag('acceptedTerms', true);
}

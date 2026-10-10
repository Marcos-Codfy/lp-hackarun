import type { SpeakerDTO } from '@application/index';

const LABELS: Record<SpeakerDTO['role'], string> = {
  instructor: 'Instrutor',
  mentor: 'Mentor egresso',
  speaker: 'Palestra',
  judge: 'Banca',
};

// papel do convidado em pt-BR (card do mentor, banca etc.)
export class SpeakerRoleLabel {
  of(role: SpeakerDTO['role']): string {
    return LABELS[role];
  }
}

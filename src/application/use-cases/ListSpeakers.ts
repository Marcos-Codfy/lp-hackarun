import type { SpeakerRepository } from '@domain/index';
import type { SpeakerDTO } from '../dto';
import { toSpeakerDTO } from './mappers';

export class ListSpeakers {
  private readonly speakers: SpeakerRepository;

  constructor(speakers: SpeakerRepository) {
    this.speakers = speakers;
  }

  // revelados primeiro, os "???" no fim pra manter a curiosidade
  async execute(): Promise<SpeakerDTO[]> {
    const list = await this.speakers.list();
    return [...list].sort((a, b) => Number(b.isRevealed) - Number(a.isRevealed)).map(toSpeakerDTO);
  }
}

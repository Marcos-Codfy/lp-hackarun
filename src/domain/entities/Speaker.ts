import { Entity } from '../shared/Entity';

export type SpeakerRole = 'instructor' | 'mentor' | 'speaker' | 'judge';

export interface SpeakerProps {
  id: string;
  name: string | null;
  role: SpeakerRole;
  headline: string;
  topic: string | null;
  avatarUrl: string | null;
  // mini currículo em parágrafos; links no formato [texto](https://...)
  bio?: readonly string[];
}

// sem nome = ainda não revelado (aparece como card bloqueado)
export class Speaker extends Entity {
  readonly name: string | null;
  readonly role: SpeakerRole;
  readonly headline: string;
  readonly topic: string | null;
  readonly avatarUrl: string | null;
  readonly bio: readonly string[];

  private constructor(props: SpeakerProps) {
    super(props.id);
    this.name = props.name?.trim() || null;
    this.role = props.role;
    this.headline = props.headline;
    this.topic = props.topic;
    this.avatarUrl = props.avatarUrl;
    this.bio = (props.bio ?? []).map((p) => p.trim()).filter(Boolean);
  }

  static create(props: SpeakerProps): Speaker {
    return new Speaker(props);
  }

  get isRevealed(): boolean {
    return this.name !== null;
  }
}

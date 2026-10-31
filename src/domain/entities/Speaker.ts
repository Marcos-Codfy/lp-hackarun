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
  // rótulo do papel no card quando o padrão não serve (ex.: "Avaliadora")
  roleLabel?: string | null;
  // perfil no LinkedIn (https://www.linkedin.com/...); o painel mostra a versão curta
  linkedin?: string | null;
}

// sem nome = ainda não revelado (aparece como card bloqueado)
export class Speaker extends Entity {
  readonly name: string | null;
  readonly role: SpeakerRole;
  readonly headline: string;
  readonly topic: string | null;
  readonly avatarUrl: string | null;
  readonly bio: readonly string[];
  readonly roleLabel: string | null;
  readonly linkedin: string | null;

  private constructor(props: SpeakerProps) {
    super(props.id);
    this.name = props.name?.trim() || null;
    this.role = props.role;
    this.headline = props.headline;
    this.topic = props.topic;
    this.avatarUrl = props.avatarUrl;
    this.bio = (props.bio ?? []).map((p) => p.trim()).filter(Boolean);
    this.roleLabel = props.roleLabel?.trim() || null;
    this.linkedin = Speaker.cleanLinkedin(props.linkedin);
  }

  static create(props: SpeakerProps): Speaker {
    return new Speaker(props);
  }

  // só aceita link do LinkedIn; tira o ?utm_... e a barra do fim (o link compartilhado do app vem cheio deles)
  private static cleanLinkedin(url: string | null | undefined): string | null {
    const value = url?.trim();
    if (!value) return null;
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !/(^|\.)linkedin\.com$/.test(parsed.hostname)) {
      throw new Error(`LinkedIn inválido: ${value}`);
    }
    return `https://www.linkedin.com${parsed.pathname.replace(/\/+$/, '')}`;
  }

  get isRevealed(): boolean {
    return this.name !== null;
  }
}

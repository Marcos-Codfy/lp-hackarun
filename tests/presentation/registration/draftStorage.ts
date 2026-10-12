// Web Storage em memória pros testes do rascunho: cota por valor e cota total (como a aba cheia de verdade)
// e o registro de cada gravação (a foto só pode ser regravada quando muda)
import { DRAFT_KEY, type DraftStorage } from '@presentation/view-models/registration/RegistrationDraft';
import {
  emptyFields,
  type RegistrationFields,
} from '@presentation/view-models/registration/RegistrationFields';
import { preparedImage } from '../../helpers/images';

export const IMAGE_KEY = `${DRAFT_KEY}:image`;

export class MemoryStorage implements DraftStorage {
  readonly data = new Map<string, string>();
  readonly writes: string[] = [];
  // cota em caracteres por valor (null = sem limite); total = soma de tudo guardado
  constructor(
    private readonly quota: number | null = null,
    private readonly total: number | null = null,
  ) {}

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.quota !== null && value.length > this.quota)
      throw new DOMException('cheio', 'QuotaExceededError');
    const others = [...this.data].filter(([k]) => k !== key).reduce((n, [, v]) => n + v.length, 0);
    if (this.total !== null && others + value.length > this.total)
      throw new DOMException('cheio', 'QuotaExceededError');
    this.writes.push(key);
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

// formulário preenchido (3 cards, foto pronta, aceite e honeypot marcados: os dois nunca vão pro rascunho)
export const filled = (patch: Partial<RegistrationFields> = {}): RegistrationFields => ({
  ...emptyFields(2),
  teamName: 'Bug Busters',
  members: [
    { key: 0, name: 'Ana Souza', studentId: '2024100123', email: 'ana@exemplo.com' },
    { key: 1, name: 'Bruno', studentId: '', email: '' },
    { key: 4, name: 'Carla Dias', studentId: '', email: '' },
  ],
  teamImage: preparedImage(),
  acceptedTerms: true,
  honeypot: 'robô',
  ...patch,
});

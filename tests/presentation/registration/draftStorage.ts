// Web Storage em memória pros testes do rascunho: cota por valor (como a aba cheia de verdade) e o registro
// de cada gravação
import type { DraftStorage } from '@presentation/view-models/registration/RegistrationDraft';
import {
  emptyFields,
  type RegistrationFields,
} from '@presentation/view-models/registration/RegistrationFields';

export class MemoryStorage implements DraftStorage {
  readonly data = new Map<string, string>();
  readonly writes: string[] = [];
  // cota em caracteres por valor (null = sem limite)
  constructor(private readonly quota: number | null = null) {}

  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    if (this.quota !== null && value.length > this.quota)
      throw new DOMException('cheio', 'QuotaExceededError');
    this.writes.push(key);
    this.data.set(key, value);
  }

  removeItem(key: string): void {
    this.data.delete(key);
  }
}

// formulário meio preenchido, com aceite e honeypot marcados (os dois nunca vão pro rascunho)
export const filled = (patch: Partial<RegistrationFields> = {}): RegistrationFields => ({
  ...emptyFields(),
  name: 'Ana Souza',
  email: 'ana@exemplo.com',
  whatsapp: '(63) 9999',
  profile: 'other-institution',
  institution: 'Faculdade Exemplo',
  course: 'Direito',
  adult: 'no',
  acceptedTerms: true,
  honeypot: 'robô',
  ...patch,
});

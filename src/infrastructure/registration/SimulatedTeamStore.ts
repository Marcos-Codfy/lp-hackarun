import type { RegistrationPayload } from '@application/index';
import type { RawTeam } from '../content/schema';

type SessionLike = Pick<Storage, 'getItem' | 'setItem'>;

const KEY = 'hackarun:dev:simulated-teams';

function sessionStore(): SessionLike | null {
  try {
    return typeof sessionStorage === 'undefined' ? null : sessionStorage;
  } catch {
    // navegador com storage bloqueado
    return null;
  }
}

const isRawTeam = (value: unknown): value is RawTeam =>
  typeof value === 'object' &&
  value !== null &&
  typeof (value as RawTeam).id === 'string' &&
  typeof (value as RawTeam).name === 'string';

// só no dev sem planilha: equipe inscrita na simulação já aparece como confirmada em /equipes, com a foto
// em data URL. Fica na memória e numa cópia no sessionStorage, pra sobreviver à troca de página na mesma aba
export class SimulatedTeamStore {
  private readonly storage: SessionLike | null;
  private teams: RawTeam[];

  constructor(storage: SessionLike | null = sessionStore()) {
    this.storage = storage;
    this.teams = this.read();
  }

  // só o que a lista pública mostra: nome, quantidade de integrantes e a foto
  add(payload: RegistrationPayload, protocol: string): void {
    if (!payload.teamName) return;
    const image = payload.teamImage;
    this.teams = [
      ...this.teams,
      {
        id: `sim-${protocol}`,
        name: payload.teamName,
        memberCount: payload.members.length,
        status: 'confirmed',
        imageUrl: image ? `data:${image.mimeType};base64,${image.base64}` : null,
      },
    ];
    this.write();
  }

  list(): RawTeam[] {
    return [...this.teams];
  }

  private read(): RawTeam[] {
    try {
      const parsed: unknown = JSON.parse(this.storage?.getItem(KEY) ?? '[]');
      return Array.isArray(parsed) ? parsed.filter(isRawTeam) : [];
    } catch {
      return [];
    }
  }

  // cota estourada (fotos grandes): segue só na memória desta página
  private write(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.teams));
    } catch {
      /* fica só na memória */
    }
  }
}

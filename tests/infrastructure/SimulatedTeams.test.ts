import { describe, expect, it } from 'vitest';
import type { RegistrationPayload } from '@application/index';
import { InMemoryRegistrationGateway } from '@infrastructure/registration/InMemoryRegistrationGateway';
import { SimulatedTeamStore } from '@infrastructure/registration/SimulatedTeamStore';
import { SimulatedTeamRepository } from '@infrastructure/repositories/SimulatedTeamRepository';
import { TEAM_IMAGE } from '../helpers/images';

// sessionStorage de mentira (e um que estoura a cota)
class MemoryStorage {
  readonly data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
}

const payload = (patch: Partial<RegistrationPayload> = {}): RegistrationPayload => ({
  teamName: 'Bug Busters',
  members: [
    { name: 'Ana Souza', studentId: 'RA-0001', email: 'ana@exemplo.com' },
    { name: 'Bruno Lima', studentId: 'RA-0002', email: 'bruno@exemplo.com' },
  ],
  teamImage: TEAM_IMAGE,
  submittedAt: '',
  source: 'landing-page',
  consentVersion: 'v',
  consentAt: '',
  honeypot: '',
  elapsedMs: 5000,
  idempotencyKey: 'chave-0001',
  ...patch,
});

describe('inscrição simulada do dev (sem planilha)', () => {
  it('a equipe aceita vai pra lista simulada já confirmada, com a foto em data URL', async () => {
    const store = new SimulatedTeamStore(new MemoryStorage());
    const gateway = new InMemoryRegistrationGateway({ sleep: () => Promise.resolve(), store });
    const { protocol } = await gateway.submit(payload());
    const [team] = await new SimulatedTeamRepository(store).list();
    expect(team?.id).toBe(`sim-${protocol}`);
    expect(team?.name.value).toBe('Bug Busters');
    expect(team?.size).toBe(2);
    expect(team?.isConfirmed).toBe(true);
    expect(team?.imageUrl).toBe(`data:image/webp;base64,${TEAM_IMAGE.base64}`);
    expect(gateway.received[0]?.teamImage).toEqual(TEAM_IMAGE);
  });

  it('reenvio com a mesma chave não duplica a equipe e a lista guarda só o que é público', async () => {
    const store = new SimulatedTeamStore(new MemoryStorage());
    const gateway = new InMemoryRegistrationGateway({ sleep: () => Promise.resolve(), store });
    await gateway.submit(payload());
    await gateway.submit(payload());
    expect(store.list()).toHaveLength(1);
    expect(Object.keys(store.list()[0] ?? {}).sort()).toEqual([
      'id',
      'imageUrl',
      'memberCount',
      'name',
      'status',
    ]);
    expect(JSON.stringify(store.list())).not.toMatch(/ana@|RA-0001|Souza/);
  });

  it('outra página da mesma aba enxerga as equipes (cópia no sessionStorage)', () => {
    const storage = new MemoryStorage();
    new SimulatedTeamStore(storage).add(payload(), 'HR26-AAAAAA');
    expect(new SimulatedTeamStore(storage).list().map((t) => t.name)).toEqual(['Bug Busters']);
  });

  it('storage cheio ou bloqueado: segue na memória da página', () => {
    const full = {
      getItem: () => '{torto',
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
    };
    const store = new SimulatedTeamStore(full);
    store.add(payload(), 'HR26-BBBBBB');
    expect(store.list()).toHaveLength(1);
    expect(new SimulatedTeamStore(null).list()).toEqual([]);
  });
});

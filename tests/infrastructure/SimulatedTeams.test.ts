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
  mode: 'team',
  teamName: 'Bug Busters',
  leader: {
    name: 'Ana Souza',
    email: 'ana@exemplo.com',
    phone: '',
    course: 'Engenharia de Software',
    semester: '',
  },
  members: [{ name: 'Bruno Lima', email: 'bruno@exemplo.com', course: '' }],
  teamImage: TEAM_IMAGE,
  accessibilityNeeds: '',
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

  it('reenvio com a mesma chave não duplica a equipe; individual não entra na lista', async () => {
    const store = new SimulatedTeamStore(new MemoryStorage());
    const gateway = new InMemoryRegistrationGateway({ sleep: () => Promise.resolve(), store });
    await gateway.submit(payload());
    await gateway.submit(payload());
    const solo = { teamName: null, teamImage: null, leader: { ...payload().leader, email: 'c@exemplo.com' } };
    await gateway.submit(payload({ mode: 'solo', ...solo }));
    expect(store.list()).toHaveLength(1);
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

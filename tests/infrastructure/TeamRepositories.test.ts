import { describe, expect, it, vi } from 'vitest';
import type { TeamRepository } from '@domain/index';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptTeamRepository } from '@infrastructure/repositories/AppsScriptTeamRepository';
import { FallbackTeamRepository } from '@infrastructure/repositories/FallbackTeamRepository';
import { StaticTeamRepository } from '@infrastructure/repositories/StaticContentRepositories';

const ENDPOINT = 'https://script.google.com/macros/s/abc/exec';

const repoReturning = (body: unknown) => {
  const fetchFn = vi.fn(async (_url: string) => new Response(JSON.stringify(body)));
  return { fetchFn, repo: new AppsScriptTeamRepository(new AppsScriptClient(ENDPOINT, fetchFn)) };
};

describe('AppsScriptTeamRepository', () => {
  it('pede ?action=teams e mapeia as linhas confirmadas', async () => {
    const { fetchFn, repo } = repoReturning({
      ok: true,
      teams: [
        { id: 'team-1', name: 'Os Brabos', course: 'ES', memberCount: 4 },
        { id: 'team-2', name: 'Solo', course: '', memberCount: 'x' },
      ],
    });
    const teams = await repo.list();
    expect(fetchFn.mock.calls[0]?.[0]).toBe(`${ENDPOINT}?action=teams`);
    expect(teams.map((t) => [t.id, t.name.value, t.course, t.size, t.status])).toEqual([
      ['team-1', 'Os Brabos', 'ES', 4, 'confirmed'],
      ['team-2', 'Solo', null, 1, 'confirmed'],
    ]);
  });

  it('linha torta é ignorada em vez de derrubar a lista', async () => {
    const { repo } = repoReturning({
      ok: true,
      teams: [{ id: 'a', name: 'X' }, { name: 'Sem id' }, { id: 'b', name: 'Boa' }],
    });
    expect((await repo.list()).map((t) => t.id)).toEqual(['b']);
  });

  it('resposta inválida vira erro (quem decide o fallback é outro)', async () => {
    await expect(repoReturning({ ok: false }).repo.list()).rejects.toThrow();
  });
});

describe('FallbackTeamRepository', () => {
  const bundled = new StaticTeamRepository([{ id: 'static', name: 'Do Build' }]);

  it('usa a planilha quando ela responde', async () => {
    const primary: TeamRepository = {
      list: async () => await new StaticTeamRepository([{ id: 'live', name: 'Ao Vivo' }]).list(),
    };
    expect((await new FallbackTeamRepository(primary, bundled).list()).map((t) => t.id)).toEqual(['live']);
  });

  it('cai pra lista do build quando a planilha falha', async () => {
    const primary: TeamRepository = { list: () => Promise.reject(new Error('offline')) };
    expect((await new FallbackTeamRepository(primary, bundled).list()).map((t) => t.id)).toEqual(['static']);
  });
});

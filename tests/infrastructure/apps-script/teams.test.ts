// @vitest-environment node
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox } from '../../helpers/apps-script/sandbox';

const SEEDED_TEAMS = [
  {
    Protocolo: 'HR26-AAAAAA',
    Equipe: '  Os Brabos ',
    'Integrantes (qtd)': 4,
    Status: 'Confirmado',
    'E-mail de contato': 'ana@exemplo.com',
    'E-mails da equipe': 'ana@exemplo.com; bruno@exemplo.com',
    Consentimento: '2026-10-v3 · 2026-10-20T15:00:00.000Z',
  },
  { Protocolo: 'HR26-BBBBBB', Equipe: 'Pendentes', 'Integrantes (qtd)': 3, Status: 'pendente' },
  { Protocolo: 'HR26-CCCCCC', Equipe: 'Recusados', 'Integrantes (qtd)': 2, Status: 'recusado' },
];
const SEEDED_MEMBERS = [
  {
    Protocolo: 'HR26-AAAAAA',
    'Nome completo': 'Ana Souza',
    Matrícula: '2024100123',
    'E-mail': 'ana@exemplo.com',
  },
];

describe('Apps Script · lista pública de equipes', () => {
  it('expõe só {id, name, memberCount, imageId} das equipes confirmadas', () => {
    const script = new AppsScriptSandbox();
    script.seed(SEEDED_TEAMS, SEEDED_MEMBERS);
    const res = script.get('teams');
    expect(res.ok).toBe(true);
    expect(res.teams).toHaveLength(1);
    const [team] = res.teams ?? [];
    expect(Object.keys(team ?? {}).sort()).toEqual(['id', 'imageId', 'memberCount', 'name']);
    expect(team).toMatchObject({ name: 'Os Brabos', memberCount: 4, imageId: null });
    expect(team?.['id']).toMatch(/^team-[0-9a-f]{10}$/);
    // nada pessoal escapa, nem o protocolo (o id é um hash dele com o segredo do script)
    const raw = JSON.stringify(res);
    ['ana@exemplo.com', 'bruno', 'Ana Souza', '2024100123', 'HR26-', '2026-10-v3'].forEach((secret) =>
      expect(raw).not.toContain(secret),
    );
  });

  it('sem a aba Equipes (planilha nova) a lista vem vazia, sem criar nada', () => {
    const script = new AppsScriptSandbox();
    expect(script.get('teams')).toEqual({ ok: true, teams: [] });
    expect(script.book.sheets).toHaveLength(0);
  });

  it('o id público não sai só do hash do protocolo (dava pra achar testando todos): usa o segredo do script', () => {
    const script = new AppsScriptSandbox();
    script.seed(SEEDED_TEAMS);
    const id = script.get('teams').teams?.[0]?.['id'];
    const plainHash = createHash('sha256').update('HR26-AAAAAA', 'utf8').digest('hex').slice(0, 10);
    expect(id).not.toBe(`team-${plainHash}`);
    const secret = script.properties['ID_SEGREDO'] ?? '';
    expect(secret.length).toBeGreaterThanOrEqual(64);
    // o segredo fica guardado: o mesmo protocolo dá o mesmo id em toda leitura
    script.cache.store.clear();
    expect(script.get('teams').teams?.[0]?.['id']).toBe(id);
    expect(script.properties['ID_SEGREDO']).toBe(secret);
  });

  it.each(['Status', 'Equipe', 'ID da foto', 'Foto'])(
    'usa o cache e o onEdit da coluna %s limpa ele na hora',
    (column) => {
      const script = new AppsScriptSandbox();
      const { teams } = script.seed(SEEDED_TEAMS);
      expect(script.get('teams').teams).toHaveLength(1);
      const statusCol = script.evaluate<string[]>('TEAM_HEADERS').indexOf('Status');
      (teams.rows[2] ?? [])[statusCol] = 'confirmado';
      expect(script.get('teams').teams).toHaveLength(1);
      const col = script.evaluate<string[]>('TEAM_HEADERS').indexOf(column) + 1;
      const range = { getSheet: () => teams, getColumn: () => col, getLastColumn: () => col };
      (script.evaluate('onEdit') as (e: unknown) => void)({ range });
      expect(script.get('teams').teams).toHaveLength(2);
    },
  );

  it('editar a aba Integrantes ou uma coluna interna não mexe no cache', () => {
    const script = new AppsScriptSandbox();
    const { teams, members } = script.seed(SEEDED_TEAMS, SEEDED_MEMBERS);
    script.get('teams');
    const onEdit = script.evaluate('onEdit') as (e: unknown) => void;
    const col = script.evaluate<string[]>('TEAM_HEADERS').indexOf('Consentimento') + 1;
    onEdit({ range: { getSheet: () => teams, getColumn: () => col, getLastColumn: () => col } });
    onEdit({ range: { getSheet: () => members, getColumn: () => 1, getLastColumn: () => 8 } });
    expect(script.cache.store.has('teams:v3')).toBe(true);
  });

  it('ação desconhecida não devolve nada', () => {
    expect(new AppsScriptSandbox().get('rows')).toEqual({ ok: false, error: 'unknown-action' });
  });
});

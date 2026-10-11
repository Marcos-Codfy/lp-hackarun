// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { MIN_FILL_MS, SubmitRegistration, type RegistrationPayload } from '@application/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { FakeGateway, teamInput } from '../../helpers/fixtures';
import { AppsScriptSandbox } from '../../helpers/apps-script/sandbox';

const eventJson = JSON.parse(
  readFileSync(new URL('../../../src/infrastructure/content/event.json', import.meta.url), 'utf8'),
) as { registration: { teamSize: { min: number; max: number } } };

const SEEDED = [
  {
    Protocolo: 'HR26-AAAAAA',
    Modalidade: 'Equipe',
    Equipe: '  Os Brabos ',
    Lider: 'Ana Souza',
    'E-mail': 'ana@exemplo.com',
    WhatsApp: '(63) 99999-1234',
    Curso: 'Engenharia de Software',
    Integrantes: 'Bruno Lima <bruno@exemplo.com>',
    Qtde: 4,
    Acessibilidade: 'intérprete de Libras',
    Status: 'Confirmado',
  },
  { Protocolo: 'HR26-BBBBBB', Modalidade: 'Equipe', Equipe: 'Pendentes', Qtde: 3, Status: 'pendente' },
  { Protocolo: 'HR26-CCCCCC', Modalidade: 'Individual', Equipe: '', Qtde: 1, Status: 'confirmado' },
];

describe('Apps Script · lista pública de equipes', () => {
  it('expõe só {id, name, course, memberCount} das equipes confirmadas', () => {
    const script = new AppsScriptSandbox();
    script.seed(SEEDED);
    const res = script.get('teams');
    expect(res.ok).toBe(true);
    expect(res.teams).toHaveLength(1);
    const [team] = res.teams ?? [];
    expect(Object.keys(team ?? {}).sort()).toEqual(['course', 'id', 'memberCount', 'name']);
    expect(team).toMatchObject({ name: 'Os Brabos', course: 'Engenharia de Software', memberCount: 4 });
    expect(team?.['id']).toMatch(/^team-[0-9a-f]{10}$/);
    // nada pessoal escapa, nem o protocolo (o id é um hash dele)
    const raw = JSON.stringify(res);
    ['ana@exemplo.com', '99999', 'Ana Souza', 'Bruno', 'Libras', 'HR26-'].forEach((secret) =>
      expect(raw).not.toContain(secret),
    );
  });

  it('usa o cache e o onEdit da coluna Status limpa ele na hora', () => {
    const script = new AppsScriptSandbox();
    const sheet = script.seed(SEEDED);
    expect(script.get('teams').teams).toHaveLength(1);
    const statusCol = script.evaluate<string[]>('HEADERS').indexOf('Status');
    (sheet.rows[2] ?? [])[statusCol] = 'confirmado';
    expect(script.get('teams').teams).toHaveLength(1);
    const range = {
      getSheet: () => sheet,
      getColumn: () => statusCol + 1,
      getLastColumn: () => statusCol + 1,
    };
    (script.evaluate('onEdit') as (e: unknown) => void)({ range });
    expect(script.get('teams').teams).toHaveLength(2);
  });

  it('ação desconhecida não devolve nada', () => {
    expect(new AppsScriptSandbox().get('rows')).toEqual({ ok: false, error: 'unknown-action' });
  });
});

describe('Apps Script · contrato com o site', () => {
  it('TEAM_SIZE do Validation.gs é igual ao registration.teamSize do event.json', () => {
    const teamSize = new AppsScriptSandbox().evaluate<{ min: number; max: number }>('TEAM_SIZE');
    expect({ min: teamSize.min, max: teamSize.max }).toEqual(eventJson.registration.teamSize);
  });

  it('MIN_ELAPSED_MS do Validation.gs é igual ao MIN_FILL_MS do SubmitRegistration', () => {
    expect(new AppsScriptSandbox().evaluate<number>('MIN_ELAPSED_MS')).toBe(MIN_FILL_MS);
  });

  // o navegador espera o mínimo antes de mandar: envio rápido de gente de verdade passa no filtro de robô
  it.each([8000, 0])(
    'o payload real do SubmitRegistration (%i ms) passa na validação do servidor',
    async (ms) => {
      const gateway = new FakeGateway();
      const useCase = new SubmitRegistration({
        gateway,
        clock: new FixedClock(new Date('2026-10-20T15:00:00Z')),
        teamSize: eventJson.registration.teamSize,
        sleep: () => Promise.resolve(),
      });
      await useCase.execute(teamInput(), {
        honeypot: '',
        elapsedMs: ms,
        idempotencyKey: '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40',
      });
      const payload = gateway.calls[0] as RegistrationPayload;
      const script = new AppsScriptSandbox();
      expect(script.post({ action: 'register', ...payload }).ok).toBe(true);
      expect(script.sheet.data[0]).toContain(`${payload.consentVersion} · ${payload.consentAt}`);
      expect(script.sheet.data[0]).toContain(payload.idempotencyKey);
    },
  );
});

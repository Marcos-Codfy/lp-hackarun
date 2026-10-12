// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  CONSENT_VERSION,
  MIN_FILL_MS,
  SubmitRegistration,
  type RegistrationPayload,
} from '@application/index';
import { Email, FullName, StudentId, TEAM_IMAGE_RULES, TeamName } from '@domain/index';
import { FixedClock } from '@infrastructure/clock/SystemClock';
import { FakeGateway, teamInput } from '../../helpers/fixtures';
import { AppsScriptSandbox } from '../../helpers/apps-script/sandbox';

const eventJson = JSON.parse(
  readFileSync(new URL('../../../src/infrastructure/content/event.json', import.meta.url), 'utf8'),
) as { registration: { teamSize: { min: number; max: number } } };

const script = new AppsScriptSandbox();
const server = <T>(name: string) => script.evaluate<(value: unknown) => T>(name);

// mesmas entradas nos dois lados: o que o site aceita o servidor aceita, e vice-versa
const NAMES = [
  'Ana Souza',
  'Li Wu',
  "Ana D'Ávila",
  'Maria-Clara Lima',
  'Ana',
  'Ana S.',
  'Ana Souza 2',
  'ana@souza.com',
  'Jo (Ana)',
  `Ana ${'x'.repeat(80)}`,
];
const STUDENT_IDS = [
  '2024100123',
  'ra-2023.044',
  '2025/0007',
  ' 0012 ',
  '123',
  '1'.repeat(20),
  '1'.repeat(21),
  '2024 100',
  '2024#1',
  'ÁBC123',
];
const EMAILS = [
  'ana@exemplo.com',
  ' Ana@Exemplo.COM ',
  'ana@exemplo',
  'ana @exemplo.com',
  '+ana@x.co',
  `${'a'.repeat(115)}@x.com`,
];
const TEAM_NAMES = ['X', 'Bug Busters', '  Bug   Busters  ', 'x'.repeat(40), 'x'.repeat(41)];

describe('Apps Script · contrato com o site', () => {
  it('TEAM_SIZE do Validation.gs é igual ao registration.teamSize do event.json', () => {
    const teamSize = script.evaluate<{ min: number; max: number }>('TEAM_SIZE');
    expect({ min: teamSize.min, max: teamSize.max }).toEqual(eventJson.registration.teamSize);
  });

  it('MIN_ELAPSED_MS do Validation.gs é igual ao MIN_FILL_MS do SubmitRegistration', () => {
    expect(script.evaluate<number>('MIN_ELAPSED_MS')).toBe(MIN_FILL_MS);
  });

  it('CONSENT_VERSION do Validation.gs é igual ao do SubmitRegistration', () => {
    expect(script.evaluate<string>('CONSENT_VERSION')).toBe(CONSENT_VERSION);
    expect(CONSENT_VERSION).toBe('2026-10-v3');
  });

  it('MAX_IMAGE_BYTES do Images.gs é igual ao teto da foto no domínio', () => {
    expect(script.evaluate<number>('MAX_IMAGE_BYTES')).toBe(TEAM_IMAGE_RULES.maxBytes);
  });

  it('limites de nome, matrícula e e-mail são os mesmos dos value objects', () => {
    expect(script.evaluate('NAME_MAX')).toBe(FullName.MAX);
    expect(script.evaluate('TEAM_NAME_LIMITS')).toEqual({ min: TeamName.MIN, max: TeamName.MAX });
    expect(script.evaluate('STUDENT_ID_LIMITS')).toEqual({ min: StudentId.MIN, max: StudentId.MAX });
    expect(String(script.evaluate('STUDENT_ID_PATTERN'))).toBe(String(StudentId.PATTERN));
    expect(script.evaluate('EMAIL_MAX')).toBe(Email.MAX);
    expect(String(script.evaluate('EMAIL_PATTERN'))).toBe(String(Email.PATTERN));
  });

  it.each(NAMES)('nome completo "%s": site e servidor concordam', (raw) => {
    const clean = server<string>('(v) => clean_(v, NAME_MAX + 1)')(raw);
    expect(server<boolean>('isFullName_')(clean)).toBe(FullName.create(raw).ok);
  });

  it.each(STUDENT_IDS)('matrícula "%s": site e servidor concordam', (raw) => {
    const normalized = server<string>('normalizeStudentId_')(raw);
    expect(server<boolean>('isStudentId_')(normalized)).toBe(StudentId.create(raw).ok);
    if (StudentId.create(raw).ok) expect(normalized).toBe(StudentId.normalize(raw));
  });

  it.each(EMAILS)('e-mail "%s": site e servidor concordam', (raw) => {
    const clean = server<string>('(v) => clean_(v, EMAIL_MAX + 1).toLowerCase()')(raw);
    expect(server<boolean>('isEmail_')(clean)).toBe(Email.create(raw).ok);
  });

  it.each(TEAM_NAMES)('nome da equipe "%s": site e servidor concordam', (raw) => {
    const clean = server<string>('(v) => clean_(v, 200)')(raw);
    const limits = script.evaluate<{ min: number; max: number }>('TEAM_NAME_LIMITS');
    expect(clean.length >= limits.min && clean.length <= limits.max).toBe(TeamName.create(raw).ok);
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
      const sandbox = new AppsScriptSandbox();
      expect(sandbox.post({ action: 'register', ...payload }).ok).toBe(true);
      expect(sandbox.teams.data[0]).toContain(`${payload.consentVersion} · ${payload.consentAt}`);
      expect(sandbox.teams.data[0]).toContain(payload.idempotencyKey);
      expect(sandbox.members.data).toHaveLength(payload.members.length);
    },
  );
});

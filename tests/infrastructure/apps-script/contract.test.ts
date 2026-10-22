// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { CONSENT_VERSION, MIN_FILL_MS, SubmitRegistration } from '@application/index';
import {
  COURSE_RULE,
  Email,
  FullName,
  INSTITUTION_RULE,
  PARTICIPANT_PROFILES,
  PERIOD_RANGE,
  ParticipantRegistration,
  Phone,
  ShortText,
  StudentId,
  TECH_AREAS,
  type ParticipantInput,
} from '@domain/index';
import { FakeGateway, ManualClock, TEAM_SIZE, participantInput } from '../../helpers/fixtures';
import { AppsScriptSandbox } from '../../helpers/apps-script/sandbox';

const script = new AppsScriptSandbox();
const server = <T>(name: string) => script.evaluate<(...args: unknown[]) => T>(name);

// mesmas entradas nos dois lados: o que o site aceita o servidor aceita, e vice-versa
const NAMES = [
  'Ana Souza',
  'Li Wu',
  "Ana D'Ávila",
  'Maria-Clara Lima',
  'Ana',
  'Ana S.',
  'Ana Souza 2',
  'Jo (Ana)',
];
const STUDENT_IDS = [
  '2024100123',
  'ra-2023.044',
  '2025/0007',
  ' 0012 ',
  '123',
  '1'.repeat(21),
  '2024 100',
  'ÁBC123',
];
const EMAILS = [
  'ana@exemplo.com',
  ' Ana@Exemplo.COM ',
  'ana@exemplo',
  'ana @exemplo.com',
  `${'a'.repeat(115)}@x.com`,
];
const PHONES = [
  '(63) 99999-1234',
  '63999991234',
  '+55 63 99999-1234',
  '55 63 3214-5678',
  '063 99999-1234',
  '(11) 2345-6789',
  '(63) 89999-1234',
  '(63) 6214-5678',
  '(01) 99999-1234',
  '(60) 99999-1234',
  '99999-1234',
  '+1 202 555 0100',
  '5563999991234',
  '556399999123',
  'nenhum',
  '   ',
];
const SHORT_TEXTS = [
  'Engenharia de Software',
  '  Sistemas   de Informação ',
  'TI',
  'ADS',
  'x'.repeat(80),
  'x'.repeat(81),
];
const SHORT_TEXT_SYMBOLS = [
  'C++',
  'C#',
  'Design & UX',
  'Eng. (noturno)',
  'A/B',
  'a<b',
  'R$',
  'x=y',
  'a|b',
  'a`b',
  '{x}',
];

// inscrições inteiras, uma por caso: o aggregate do site e o servidor têm de concordar no resultado e nos dados
const PROFILE_CASES: [string, Partial<ParticipantInput>][] = [
  ['UniCatólica completa', {}],
  ['UniCatólica sem matrícula', { studentId: '' }],
  ['UniCatólica com instituição digitada', { institution: 'Outra' }],
  ['UniCatólica com matrícula torta', { studentId: '12#4' }],
  ['UniCatólica sem período', { period: '' }],
  ['UniCatólica período 10', { period: '10' }],
  ['UniCatólica período 11', { period: '11' }],
  ['UniCatólica período 2.5', { period: '2.5' }],
  ['outra instituição', { profile: 'other-institution', institution: 'IFTO', studentId: 'RA-1' }],
  ['outra instituição sem instituição', { profile: 'other-institution', institution: ' ' }],
  ['outra instituição curta', { profile: 'other-institution', institution: 'X' }],
  ['formado', { profile: 'graduate', course: 'Direito', area: 'product', period: '' }],
  ['formado sem área', { profile: 'graduate', course: 'Direito' }],
  ['formado sem curso', { profile: 'graduate', course: '', area: 'design' }],
  ['por conta própria', { profile: 'self-taught', course: '', period: '', area: 'infra' }],
  ['por conta própria com curso torto', { profile: 'self-taught', course: '<b>', area: 'other' }],
  ['por conta própria sem área', { profile: 'self-taught', area: '' }],
  ['menor de idade', { adult: 'no' }],
  ['sem resposta da idade', { adult: '' }],
  ['sem perfil', { profile: '' }],
  ['WhatsApp torto', { whatsapp: '1234' }],
];

// o que o site manda depois do aggregate (ParticipantData) a partir do texto do formulário
const ADULT = { yes: true, no: false, '': undefined } as const;
const asSent = (input: ParticipantInput) => ({ ...input, adult: ADULT[input.adult] });

describe('Apps Script · contrato com o site', () => {
  it('MIN_ELAPSED_MS e CONSENT_VERSION do Validation.gs são iguais aos do SubmitRegistration', () => {
    expect(script.evaluate<number>('MIN_ELAPSED_MS')).toBe(MIN_FILL_MS);
    expect(script.evaluate<string>('CONSENT_VERSION')).toBe(CONSENT_VERSION);
    expect(CONSENT_VERSION).toBe('2026-10-v5');
  });

  it('limites e padrões são os mesmos dos value objects e do aggregate', () => {
    expect(script.evaluate('NAME_MAX')).toBe(FullName.MAX);
    expect(script.evaluate('STUDENT_ID_LIMITS')).toEqual({ min: StudentId.MIN, max: StudentId.MAX });
    expect(String(script.evaluate('STUDENT_ID_PATTERN'))).toBe(String(StudentId.PATTERN));
    expect(script.evaluate('EMAIL_MAX')).toBe(Email.MAX);
    expect(String(script.evaluate('EMAIL_PATTERN'))).toBe(String(Email.PATTERN));
    expect(String(script.evaluate('SHORT_TEXT_FORBIDDEN'))).toBe(String(ShortText.FORBIDDEN));
    expect(script.evaluate('COURSE_LIMITS')).toEqual({ min: COURSE_RULE.min, max: COURSE_RULE.max });
    expect(script.evaluate('INSTITUTION_LIMITS')).toEqual({
      min: INSTITUTION_RULE.min,
      max: INSTITUTION_RULE.max,
    });
    expect(script.evaluate('PERIOD_RANGE')).toEqual({ ...PERIOD_RANGE });
  });

  it('perfis e áreas são os mesmos do domínio e todos têm rótulo em pt-BR na planilha', () => {
    expect(script.evaluate('PROFILES')).toEqual([...PARTICIPANT_PROFILES]);
    expect(script.evaluate('AREAS')).toEqual([...TECH_AREAS]);
    expect(Object.keys(script.evaluate<object>('PROFILE_LABELS'))).toEqual([...PARTICIPANT_PROFILES]);
    expect(Object.keys(script.evaluate<object>('AREA_LABELS'))).toEqual([...TECH_AREAS]);
  });

  it.each(NAMES)('nome completo "%s": site e servidor concordam', (raw) => {
    const clean = server<string>('(v) => clean_(v, NAME_MAX + 1)')(raw);
    expect(server<boolean>('isFullName_')(clean)).toBe(FullName.create(raw).ok);
  });

  it.each(STUDENT_IDS)('matrícula "%s": site e servidor concordam', (raw) => {
    const normalized = server<string>('normalizeStudentId_')(raw);
    expect(server<boolean>('isStudentId_')(normalized)).toBe(StudentId.create(raw).ok);
    expect(normalized).toBe(StudentId.normalize(raw));
  });

  it.each(EMAILS)('e-mail "%s": site e servidor concordam', (raw) => {
    const clean = server<string>('(v) => clean_(v, EMAIL_MAX + 1).toLowerCase()')(raw);
    expect(server<boolean>('isEmail_')(clean)).toBe(Email.create(raw).ok);
  });

  it.each(PHONES)('WhatsApp "%s": mesmo resultado, mesmo formato e mesmos dígitos', (raw) => {
    const site = Phone.create(raw);
    const mine = server<{ value: string; digits: string } | null>('normalizePhone_')(raw);
    expect(mine !== null).toBe(site.ok);
    if (site.ok) expect(mine).toEqual({ value: site.value.value, digits: site.value.digits });
    expect(server<string>('phoneDigits_')(raw)).toBe(Phone.digitsOf(raw));
  });

  it.each([...SHORT_TEXTS, ...SHORT_TEXT_SYMBOLS])('curso "%s": site e servidor concordam', (raw) => {
    const site = ShortText.create(raw, COURSE_RULE);
    const mine = server<string>('(v) => cleanText_(v, COURSE_LIMITS)')(raw);
    expect(mine).toBe(site.ok ? site.value.value : '');
  });

  it.each(['X', 'IF', 'x'.repeat(100), 'x'.repeat(101)])(
    'instituição "%s": site e servidor concordam',
    (raw) => {
      const site = ShortText.create(raw, INSTITUTION_RULE);
      expect(server<string>('(v) => cleanText_(v, INSTITUTION_LIMITS)')(raw)).toBe(
        site.ok ? site.value.value : '',
      );
    },
  );

  it.each(PROFILE_CASES)(
    'inscrição "%s": aggregate e servidor dão o mesmo resultado e os mesmos dados',
    (_c, patch) => {
      const input = participantInput(patch);
      const site = ParticipantRegistration.create(input);
      const mine = server<Record<string, unknown> | null>('parseParticipant_')(asSent(input));
      expect(mine !== null).toBe(site.ok);
      if (site.ok && mine) {
        const { phoneDigits, ...data } = mine;
        expect(data).toEqual({ ...site.value.data });
        expect(phoneDigits).toBe(Phone.digitsOf(site.value.data.whatsapp));
      }
    },
  );

  // o navegador espera o mínimo antes de mandar: envio rápido de gente de verdade passa no filtro de robô
  it.each([
    ['UniCatólica', {}, 8000],
    ['outra instituição', { profile: 'other-institution', institution: 'IFTO' }, 0],
    ['formado', { profile: 'graduate', area: 'data-ai', period: '' }, 8000],
    ['por conta própria, menor', { profile: 'self-taught', course: '', area: 'design', adult: 'no' }, 8000],
  ] as const)(
    'o payload real do SubmitRegistration (%s, %i ms) é gravado pelo servidor',
    async (_c, patch, ms) => {
      const gateway = new FakeGateway();
      const useCase = new SubmitRegistration({
        gateway,
        clock: new ManualClock('2026-10-20T15:00:00Z'),
        teamSize: TEAM_SIZE,
        sleep: () => Promise.resolve(),
      });
      const result = await useCase.execute(participantInput(patch as Partial<ParticipantInput>), {
        honeypot: '',
        elapsedMs: ms,
        idempotencyKey: '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40',
      });
      expect(result.status).toBe('success');
      const payload = gateway.calls[0];
      const sandbox = new AppsScriptSandbox();
      expect(sandbox.post({ action: 'register', ...payload }).ok).toBe(true);
      const row = sandbox.row(sandbox.registrations, 0);
      expect(row['Consentimento']).toBe(`${payload?.consentVersion} · ${payload?.consentAt}`);
      expect(row['Chave de envio']).toBe(payload?.idempotencyKey);
      expect(row['WhatsApp']).toBe(payload?.participant.whatsapp);
    },
  );
});

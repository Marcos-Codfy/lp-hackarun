// contrato do cadastro de mentor: o site (MentorRegistration) e o servidor (Mentors.gs) concordam nas listas, nos
// limites e no resultado de cada caso. Mesmas entradas nos dois lados: o que o site aceita o servidor aceita
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MENTOR_CONSENT_VERSION, MIN_FILL_MS, SubmitMentorRegistration } from '@application/index';
import {
  GRADUATION_YEAR_RANGE,
  MENTOR_AREAS,
  MENTOR_COMPANY_RULE,
  MENTOR_COURSE_RULE,
  MENTOR_DAYS,
  MENTOR_EXPERIENCE,
  MENTOR_FORMATS,
  MENTOR_MODES,
  MENTOR_NOTES_RULE,
  MENTOR_ROLE_RULE,
  MENTOR_SPECIALTIES_RULE,
  MentorRegistration,
  ProfileLink,
  type MentorInput,
} from '@domain/index';
import { AppsScriptSandbox, mentorBody } from '../../helpers/apps-script/sandbox';
import { FakeMentorGateway, mentorInput } from '../../helpers/mentorFixtures';
import { FixedClock } from '@infrastructure/clock/SystemClock';

const script = new AppsScriptSandbox();
const value = <T>(name: string) => script.evaluate<T>(name);

describe('Apps Script · contrato do cadastro de mentor com o site', () => {
  it('as listas de opções são as mesmas (áreas, experiência, formato, modo e dias)', () => {
    expect(value<string[]>('MENTOR_AREAS')).toEqual([...MENTOR_AREAS]);
    expect(value<string[]>('MENTOR_EXPERIENCE')).toEqual([...MENTOR_EXPERIENCE]);
    expect(value<string[]>('MENTOR_FORMATS')).toEqual([...MENTOR_FORMATS]);
    expect(value<string[]>('MENTOR_MODES')).toEqual([...MENTOR_MODES]);
    expect(value<string[]>('MENTOR_DAYS')).toEqual([...MENTOR_DAYS]);
  });

  it('todo rótulo da planilha existe para toda opção (nenhuma opção cai sem tradução)', () => {
    const labels = (name: string) => Object.keys(value<Record<string, string>>(name)).sort();
    expect(labels('MENTOR_AREA_LABELS')).toEqual([...MENTOR_AREAS].sort());
    expect(labels('MENTOR_EXPERIENCE_LABELS')).toEqual([...MENTOR_EXPERIENCE].sort());
    expect(labels('MENTOR_FORMAT_LABELS')).toEqual([...MENTOR_FORMATS].sort());
    expect(labels('MENTOR_MODE_LABELS')).toEqual([...MENTOR_MODES].sort());
    expect(labels('MENTOR_DAY_LABELS')).toEqual([...MENTOR_DAYS].sort());
  });

  it('limites de texto, intervalo do ano e tamanho do endereço são os mesmos', () => {
    expect(value('MENTOR_ROLE_LIMITS')).toEqual({ min: MENTOR_ROLE_RULE.min, max: MENTOR_ROLE_RULE.max });
    expect(value('MENTOR_COMPANY_LIMITS')).toEqual({
      min: MENTOR_COMPANY_RULE.min,
      max: MENTOR_COMPANY_RULE.max,
    });
    expect(value('MENTOR_SPECIALTIES_LIMITS')).toEqual({
      min: MENTOR_SPECIALTIES_RULE.min,
      max: MENTOR_SPECIALTIES_RULE.max,
    });
    expect(value('MENTOR_COURSE_LIMITS')).toEqual({
      min: MENTOR_COURSE_RULE.min,
      max: MENTOR_COURSE_RULE.max,
    });
    expect(value('MENTOR_NOTES_LIMITS')).toEqual({ min: MENTOR_NOTES_RULE.min, max: MENTOR_NOTES_RULE.max });
    expect(value('GRADUATION_YEARS')).toEqual({ ...GRADUATION_YEAR_RANGE });
    expect(value<number>('PROFILE_LINK_MAX')).toBe(ProfileLink.MAX);
    expect(value<RegExp>('PROFILE_LINK_PATTERN').source).toBe(ProfileLink.PATTERN.source);
  });

  it('a versão do aviso dos mentores e o tempo mínimo de preenchimento são iguais', () => {
    expect(value<string>('MENTOR_CONSENT_VERSION')).toBe(MENTOR_CONSENT_VERSION);
    expect(MENTOR_CONSENT_VERSION).toBe('2026-10-m1');
    expect(value<number>('MIN_ELAPSED_MS')).toBe(MIN_FILL_MS);
  });

  // o que o site manda depois do aggregate a partir do texto do formulário
  const asSent = (input: MentorInput) => ({
    ...input,
    graduate: input.graduate === 'yes' ? true : input.graduate === 'no' ? false : undefined,
    days: [...input.days],
  });

  const CASES: [string, Partial<MentorInput>][] = [
    ['completo', {}],
    ['não egresso', { graduate: 'no', course: '', graduationYear: '' }],
    ['não egresso com lixo nos campos de egresso', { graduate: 'no', course: '<b>', graduationYear: 'x' }],
    ['sem opcionais', { specialties: '', company: '', linkedin: '', notes: '', mayPublish: false }],
    ['nome sem sobrenome', { name: 'Ana' }],
    ['nome com número', { name: 'Ana Souza 2' }],
    ['e-mail torto', { email: 'ana@exemplo' }],
    ['e-mail em caixa alta', { email: ' ANA@EXEMPLO.COM ' }],
    ['WhatsApp com +55', { whatsapp: '+55 63 99999-1234' }],
    ['WhatsApp fixo', { whatsapp: '(63) 3214-5678' }],
    ['WhatsApp torto', { whatsapp: '1234' }],
    ['área outra', { area: 'other' }],
    ['área tech lead', { area: 'tech-lead' }],
    ['sem área', { area: '' }],
    ['cargo curto', { role: 'TI' }],
    ['cargo de 1 letra', { role: 'T' }],
    ['cargo de 80', { role: 'x'.repeat(80) }],
    ['cargo de 81', { role: 'x'.repeat(81) }],
    ['cargo com símbolo', { role: 'Dev {senior}' }],
    ['cargo com C++', { role: 'Dev C++' }],
    ['cargo com R$', { role: 'Pago R$' }],
    ['empresa de 100', { company: 'x'.repeat(100) }],
    ['empresa de 101', { company: 'x'.repeat(101) }],
    ['empresa de 1 letra', { company: 'X' }],
    ['especialidades de 120', { specialties: 'x'.repeat(120) }],
    ['especialidades de 121', { specialties: 'x'.repeat(121) }],
    ['observação de 300', { notes: 'x'.repeat(300) }],
    ['observação de 301', { notes: 'x'.repeat(301) }],
    ['observação com igual', { notes: 'a=b' }],
    ['sem experiência', { experience: '' }],
    ['experiência mais de 10', { experience: 'over-10' }],
    ['LinkedIn completo', { linkedin: 'https://www.linkedin.com/in/ana' }],
    ['LinkedIn sem https', { linkedin: 'linkedin.com/in/ana' }],
    ['LinkedIn com http', { linkedin: 'http://github.com/ana' }],
    ['LinkedIn com espaço', { linkedin: 'https://exemplo.com/a b' }],
    ['LinkedIn texto', { linkedin: 'meu perfil' }],
    ['LinkedIn com script', { linkedin: 'https://exemplo.com/<script>' }],
    ['LinkedIn sem domínio válido', { linkedin: 'https://exemplo' }],
    [
      'LinkedIn de 200',
      { linkedin: `https://exemplo.com/${'a'.repeat(200 - 'https://exemplo.com/'.length)}` },
    ],
    [
      'LinkedIn de 201',
      { linkedin: `https://exemplo.com/${'a'.repeat(201 - 'https://exemplo.com/'.length)}` },
    ],
    ['sem resposta de egresso', { graduate: '' }],
    ['egresso sem curso', { course: '' }],
    ['egresso com curso curto', { course: 'TI' }],
    ['egresso com ano 1995', { graduationYear: '1995' }],
    ['egresso com ano 1994', { graduationYear: '1994' }],
    ['egresso com ano 2030', { graduationYear: '2030' }],
    ['egresso com ano 2031', { graduationYear: '2031' }],
    ['egresso com ano quebrado', { graduationYear: '2019.5' }],
    ['egresso sem ano', { graduationYear: '' }],
    ['dias fora de ordem e repetidos', { days: ['14', '11', '14'] }],
    ['só a combinar', { days: ['tbd'] }],
    ['dias que não existem', { days: ['10', '15'] }],
    ['nenhum dia', { days: [] }],
    ['sem formato', { format: '' }],
    ['formato online', { format: 'online' }],
    ['sem modo', { mode: '' }],
    ['modo uma equipe', { mode: 'one-team' }],
  ];

  it.each(CASES)(
    'caso "%s": site e servidor chegam ao mesmo resultado e aos mesmos dados',
    (_label, patch) => {
      const input = mentorInput(patch);
      const domain = MentorRegistration.create({ ...input, acceptedTerms: true });
      // o servidor valida o que o site mandaria; sem aceite aqui, o corpo leva o consentimento certo
      const body = mentorBody(asSent(input) as unknown as Record<string, unknown>);
      const res = new AppsScriptSandbox().post(body);
      expect(res.ok, `site: ${domain.ok}`).toBe(domain.ok);
      if (!domain.ok) return;
      // dados gravados = dados do aggregate (o servidor refaz as mesmas limpezas)
      const sandbox = new AppsScriptSandbox();
      expect(sandbox.post(mentorBody({ ...domain.value.data })).ok).toBe(true);
      const row = sandbox.row(sandbox.tab('Mentores'), 0);
      expect(row['E-mail']).toBe(domain.value.data.email);
      expect(row['WhatsApp']).toBe(domain.value.data.whatsapp);
      expect(row['Nome completo']).toBe(domain.value.data.name);
      expect(row['Cargo']).toBe(domain.value.data.role);
      expect(row['LinkedIn ou site']).toBe(domain.value.data.linkedin);
    },
  );

  it('o que o aggregate devolve é aceito pelo servidor sem mudar nada (duas limpezas dão o mesmo)', () => {
    for (const [, patch] of CASES) {
      const domain = MentorRegistration.create(mentorInput(patch));
      if (!domain.ok) continue;
      const parsed = script.evaluate<(body: unknown) => { mentor: Record<string, unknown> } | null>(
        'validateMentor_',
      )(mentorBody({ ...domain.value.data }));
      expect(parsed, JSON.stringify(patch)).not.toBeNull();
      const { phoneDigits: _digits, ...mentor } = parsed?.mentor ?? {};
      expect(mentor).toEqual({ ...domain.value.data });
    }
  });

  it('o que o caso de uso manda ao gateway é o que o servidor aceita (payload de ponta a ponta)', async () => {
    const gateway = new FakeMentorGateway();
    const useCase = new SubmitMentorRegistration({
      gateway,
      clock: new FixedClock(new Date('2026-10-27T15:00:00.000Z')),
      sleep: () => Promise.resolve(),
    });
    const result = await useCase.execute(mentorInput(), {
      honeypot: '',
      elapsedMs: 9000,
      idempotencyKey: '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40',
    });
    expect(result.status).toBe('success');
    const sandbox = new AppsScriptSandbox();
    const res = sandbox.post({ action: 'register-mentor', ...gateway.calls[0] });
    expect(res.ok).toBe(true);
    const row = sandbox.row(sandbox.tab('Mentores'), 0);
    expect(row['Consentimento']).toBe('2026-10-m1 · 2026-10-27T15:00:00.000Z');
    expect(row['Chave de envio']).toBe('3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40');
  });
});

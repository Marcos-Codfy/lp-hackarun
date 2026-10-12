// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, MEMBER_A, MEMBER_B, registrationBody } from '../../helpers/apps-script/sandbox';

const withMember = (index: number, patch: Record<string, unknown>) => {
  const members = [MEMBER_A, MEMBER_B].map((m, i) => (i === index ? { ...m, ...patch } : m));
  return registrationBody({ members });
};
const extra = (n: number) => ({
  name: 'Pessoa Extra',
  studentId: `RA-000${n}`,
  email: `extra${n}@exemplo.com`,
});

describe('Apps Script · validação do envio', () => {
  it('grava a equipe com protocolo, status pendente, contato, e-mails e consentimento', () => {
    const script = new AppsScriptSandbox();
    const res = script.post(registrationBody());
    expect(res.ok).toBe(true);
    expect(res.protocol).toMatch(/^HR26-[A-HJ-NP-Z2-9]{6}$/);
    expect(script.row(script.teams, 0)).toMatchObject({
      Protocolo: res.protocol,
      Equipe: 'Bug Busters',
      'Integrantes (qtd)': 2,
      Status: 'pendente',
      'E-mail de contato': 'ana@exemplo.com',
      'E-mails da equipe': 'ana@exemplo.com; bruno@exemplo.com',
      Origem: 'landing-page',
      Consentimento: '2026-10-v3 · 2026-10-20T15:00:00.000Z',
    });
    expect(script.row(script.teams, 0)['Data/hora']).toBeInstanceOf(Date);
    expect(script.lock.held).toBe(false);
  });

  it('normaliza o que chega: matrícula em maiúsculas, e-mail em minúsculas, nome sem espaço sobrando', () => {
    const script = new AppsScriptSandbox();
    script.post(
      withMember(1, { name: '  Bruno   Lima ', studentId: ' ra-2023.044 ', email: 'Bruno@Exemplo.COM' }),
    );
    expect(script.row(script.members, 1)).toMatchObject({
      'Nome completo': 'Bruno Lima',
      Matrícula: 'RA-2023.044',
      'E-mail': 'bruno@exemplo.com',
    });
  });

  it.each([
    ['nome da equipe curto', registrationBody({ teamName: 'X' })],
    ['nome da equipe longo', registrationBody({ teamName: 'Equipe '.repeat(7) })],
    ['equipe abaixo do mínimo', registrationBody({ members: [MEMBER_A] })],
    [
      'equipe acima do máximo',
      registrationBody({
        members: [MEMBER_A, MEMBER_B, 1, 2, 3, 4].map((m) => (typeof m === 'number' ? extra(m) : m)),
      }),
    ],
    ['sem integrantes', registrationBody({ members: 'Ana, Bruno' })],
    ['integrante que não é objeto', registrationBody({ members: [MEMBER_A, 'Bruno'] })],
    ['nome sem sobrenome', withMember(0, { name: 'Ana' })],
    ['nome com número', withMember(0, { name: 'Ana Souza 2' })],
    ['sobrenome abreviado', withMember(0, { name: 'Ana S.' })],
    ['nome longo demais', withMember(0, { name: `Ana ${'Souza'.repeat(20)}` })],
    ['sem matrícula', withMember(1, { studentId: '  ' })],
    ['matrícula curta', withMember(1, { studentId: '123' })],
    ['matrícula longa', withMember(1, { studentId: '1'.repeat(21) })],
    ['matrícula com espaço', withMember(1, { studentId: '2024 100' })],
    ['matrícula com símbolo', withMember(1, { studentId: '2024#100' })],
    ['e-mail inválido', withMember(1, { email: 'bruno@' })],
    ['e-mail repetido na equipe', withMember(1, { email: 'ANA@exemplo.com' })],
    ['matrícula repetida na equipe', withMember(1, { studentId: '2024100123' })],
    ['sem versão do consentimento', registrationBody({ consentVersion: '' })],
    ['aceite de uma versão antiga do aviso', registrationBody({ consentVersion: '2026-10-v2' })],
    ['consentimento com data torta', registrationBody({ consentAt: 'ontem' })],
  ])('recusa %s', (_case, body) => {
    const script = new AppsScriptSandbox();
    expect(script.post(body)).toEqual({ ok: false, error: 'invalid' });
    expect(script.book.sheets).toHaveLength(0);
  });

  it.each(['=', '+', '-', '@'])('neutraliza fórmula começando com "%s"', (prefix) => {
    const script = new AppsScriptSandbox();
    const payload = `${prefix}HYPERLINK("https://exemplo.com")`;
    script.post(registrationBody({ teamName: payload.slice(0, 40), source: payload }));
    const cells = [...script.teams.data[0]!, ...script.members.data[0]!];
    const texts = cells.filter((v): v is string => typeof v === 'string');
    expect(texts.filter((v) => /^[=+\-@]/.test(v))).toEqual([]);
    expect(cells).toContain(`'${payload.slice(0, 40)}`);
  });

  it('e-mail começando com "+" ou "-" é aceito e gravado como texto puro', () => {
    const script = new AppsScriptSandbox();
    expect(script.post(withMember(1, { email: '-bruno@exemplo.com' })).ok).toBe(true);
    expect(script.row(script.members, 1)['E-mail']).toBe("'-bruno@exemplo.com");
  });

  it.each([
    ['honeypot preenchido', { honeypot: 'https://spam.example' }],
    ['enviado rápido demais', { elapsedMs: 900 }],
    ['sem tempo de preenchimento', { elapsedMs: undefined }],
  ])('barra robô: %s', (_case, patch) => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody(patch))).toEqual({ ok: false, error: 'invalid' });
    expect(script.cache.store.size).toBe(0);
  });

  it('corpo que não é objeto JSON é recusado', () => {
    const script = new AppsScriptSandbox();
    expect(script.postRaw('nada')).toEqual({ ok: false, error: 'invalid' });
    expect(script.postRaw('[1,2]')).toEqual({ ok: false, error: 'invalid' });
  });
});

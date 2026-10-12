// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, registrationBody } from '../../helpers/apps-script/sandbox';

const leader = registrationBody()['leader'] as Record<string, unknown>;
const withLeader = (patch: Record<string, unknown>) => registrationBody({ leader: { ...leader, ...patch } });
const member = (name: string, email: string) => ({ name, email, course: '' });

describe('Apps Script · validação do envio', () => {
  it('grava a inscrição válida com protocolo, status pendente e consentimento', () => {
    const script = new AppsScriptSandbox();
    const res = script.post(registrationBody());
    expect(res.ok).toBe(true);
    expect(res.protocol).toMatch(/^HR26-[A-HJ-NP-Z2-9]{6}$/);
    const headers = script.sheet.rows[0] ?? [];
    const row = script.sheet.data[0] ?? [];
    const cell = (name: string) => row[headers.indexOf(name)];
    expect(cell('Protocolo')).toBe(res.protocol);
    expect(cell('Modalidade')).toBe('Equipe');
    expect(cell('Integrantes')).toBe('Bruno Lima <bruno@exemplo.com> - Ciência da Computação');
    expect(cell('Qtde')).toBe(2);
    expect(cell('Status')).toBe('pendente');
    expect(cell('Consentimento')).toBe('2026-10-v2 · 2026-10-20T15:00:00.000Z');
    expect(script.lock.held).toBe(false);
  });

  it.each([
    ['sem modalidade', registrationBody({ mode: 'duo' })],
    ['nome sem sobrenome', withLeader({ name: 'Ana' })],
    ['e-mail do líder inválido', withLeader({ email: 'ana@exemplo' })],
    ['WhatsApp sem DDD', withLeader({ phone: '99999-1234' })],
    ['sem curso', withLeader({ course: '  ' })],
    ['nome da equipe curto', registrationBody({ teamName: 'X' })],
    ['equipe abaixo do mínimo', registrationBody({ members: [] })],
    [
      'equipe acima do máximo',
      registrationBody({
        members: ['b', 'c', 'd', 'e', 'f'].map((l) => member(`Pessoa ${l}`, `${l}@exemplo.com`)),
      }),
    ],
    ['e-mail de integrante inválido', registrationBody({ members: [member('Bruno Lima', 'bruno@')] })],
    ['e-mail repetido na equipe', registrationBody({ members: [member('Bruno Lima', 'ANA@exemplo.com')] })],
    ['sem versão do consentimento', registrationBody({ consentVersion: '' })],
    ['aceite de uma versão antiga do aviso', registrationBody({ consentVersion: '2026-10-v1' })],
    ['consentimento com data torta', registrationBody({ consentAt: 'ontem' })],
  ])('recusa %s', (_case, body) => {
    const script = new AppsScriptSandbox();
    expect(script.post(body)).toEqual({ ok: false, error: 'invalid' });
    expect(script.sheets.size).toBe(0);
  });

  it('inscrição individual não exige equipe e ignora integrantes', () => {
    const script = new AppsScriptSandbox();
    const res = script.post(registrationBody({ mode: 'solo', teamName: 'Ignorado', members: [] }));
    expect(res.ok).toBe(true);
    const row = script.sheet.data[0] ?? [];
    expect(row.slice(2, 4)).toEqual(['Individual', '']);
  });

  it('e-mail de líder já inscrito (sem diferenciar caixa) vira "duplicate"', () => {
    const script = new AppsScriptSandbox();
    script.seed([{ Protocolo: 'HR26-AAAAAA', 'E-mail': 'ana@exemplo.com', Status: 'pendente' }]);
    expect(script.post(withLeader({ email: 'Ana@Exemplo.com' }))).toEqual({ ok: false, error: 'duplicate' });
    expect(script.sheet.data).toHaveLength(1);
  });

  it('reenvio do mesmo envio (mesmo e-mail e horário) devolve o mesmo protocolo sem duplicar', () => {
    const script = new AppsScriptSandbox();
    const first = script.post(registrationBody());
    expect(script.post(registrationBody())).toEqual(first);
    expect(script.sheet.data).toHaveLength(1);
  });

  it.each(['=', '+', '-', '@'])('neutraliza fórmula começando com "%s"', (prefix) => {
    const script = new AppsScriptSandbox();
    const payload = `${prefix}HYPERLINK("https://exemplo.com")`;
    script.post(
      registrationBody({
        teamName: payload,
        accessibilityNeeds: payload,
        leader: { ...leader, name: `${prefix}Ana Souza`, course: payload },
      }),
    );
    const row = script.sheet.data[0] ?? [];
    const texts = row.filter((v): v is string => typeof v === 'string');
    expect(texts.filter((v) => /^[=+\-@]/.test(v))).toEqual([]);
    expect(row).toContain(`'${payload}`);
    expect(row).toContain(`'${prefix}Ana Souza`);
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

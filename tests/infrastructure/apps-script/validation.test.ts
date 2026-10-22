// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, registrationBody } from '../../helpers/apps-script/sandbox';

const OTHER = {
  profile: 'other-institution',
  institution: 'IFTO',
  course: 'Sistemas de Informação',
  period: '5',
};
const GRADUATE = { profile: 'graduate', course: 'Ciência da Computação', area: 'data-ai' };
const SELF_TAUGHT = { profile: 'self-taught', area: 'security' };

function saved(participant: Record<string, unknown>, overrides: Record<string, unknown> = {}) {
  const script = new AppsScriptSandbox();
  const res = script.post(registrationBody(participant, overrides));
  return { script, res, row: res.ok ? script.row(script.registrations, 0) : {} };
}

describe('Apps Script · validação do envio (uma pessoa por inscrição)', () => {
  it('grava a aluna da UniCatólica com protocolo, rótulos em pt-BR, status inscrito e consentimento', () => {
    const { script, res, row } = saved({});
    expect(res.ok).toBe(true);
    expect(res.protocol).toMatch(/^HR26-[A-HJ-NP-Z2-9]{6}$/);
    expect(row).toMatchObject({
      Protocolo: res.protocol,
      'Nome completo': 'Ana Souza',
      'E-mail': 'ana@exemplo.com',
      WhatsApp: '(63) 99999-0001',
      Perfil: 'Estuda na UniCatólica',
      Instituição: 'UniCatólica',
      Curso: 'Engenharia de Software',
      Período: '3º',
      Matrícula: '2024100123',
      Área: '',
      '18 anos ou mais': 'Sim',
      'Autorização do responsável': 'não precisa',
      Status: 'inscrito',
      Equipe: '',
      Origem: 'landing-page',
      Consentimento: '2026-10-v5 · 2026-10-20T15:00:00.000Z',
    });
    expect(row['Data/hora']).toBeInstanceOf(Date);
    expect(script.lock.held).toBe(false);
  });

  it('menor de 18 anos entra com a autorização do responsável pendente', () => {
    const { row } = saved({ adult: false });
    expect(row).toMatchObject({ '18 anos ou mais': 'Não', 'Autorização do responsável': 'pendente' });
  });

  it('outra instituição: guarda a instituição digitada; matrícula e área que vieram junto são ignoradas', () => {
    const { row } = saved({ ...OTHER, studentId: 'RA-9999', area: 'design' });
    expect(row).toMatchObject({
      Perfil: 'Estuda em outra instituição',
      Instituição: 'IFTO',
      Curso: 'Sistemas de Informação',
      Período: '5º',
      Matrícula: '',
      Área: '',
    });
  });

  it('outra instituição sem instituição é aceita (o campo é opcional)', () => {
    expect(saved({ ...OTHER, institution: '   ' }).row['Instituição']).toBe('');
  });

  it('UniCatólica: a instituição é sempre UniCatólica e a matrícula é opcional', () => {
    const { row } = saved({ institution: 'Outra Faculdade', studentId: '' });
    expect(row).toMatchObject({ Instituição: 'UniCatólica', Matrícula: '' });
  });

  it('já formado: curso e área ficam; período, instituição e matrícula saem vazios', () => {
    const { row } = saved({ ...GRADUATE, period: 4, institution: 'UFT', studentId: '2024100123' });
    expect(row).toMatchObject({
      Perfil: 'Já se formou',
      Curso: 'Ciência da Computação',
      Área: 'Dados e IA',
      Período: '',
      Instituição: '',
      Matrícula: '',
    });
  });

  it('por conta própria: curso não é pedido (o que vier é ignorado), a área é', () => {
    const { row } = saved({ ...SELF_TAUGHT, course: '<script>', period: 99 });
    expect(row).toMatchObject({
      Perfil: 'Trabalha ou estuda por conta própria',
      Curso: '',
      Período: '',
      Área: 'Segurança',
    });
  });

  it('normaliza o que chega: e-mail em minúsculas, matrícula em maiúsculas, WhatsApp formatado', () => {
    const { row } = saved({
      name: '  Ana   Souza ',
      email: ' Ana@Exemplo.COM ',
      whatsapp: '+55 63 9 9999-0001',
      studentId: ' ra-2023.044 ',
      course: '  Engenharia   de Software ',
    });
    expect(row).toMatchObject({
      'Nome completo': 'Ana Souza',
      'E-mail': 'ana@exemplo.com',
      WhatsApp: '(63) 99999-0001',
      Matrícula: 'RA-2023.044',
      Curso: 'Engenharia de Software',
    });
  });

  it.each([
    ['nome sem sobrenome', { name: 'Ana' }],
    ['nome com número', { name: 'Ana Souza 2' }],
    ['e-mail inválido', { email: 'ana@' }],
    ['sem WhatsApp', { whatsapp: '' }],
    ['WhatsApp sem DDD', { whatsapp: '99999-0001' }],
    ['WhatsApp com DDD que não existe', { whatsapp: '(01) 99999-0001' }],
    ['celular sem o 9', { whatsapp: '(63) 89999-0001' }],
    ['sem perfil', { profile: '' }],
    ['perfil fora da lista', { profile: 'professor' }],
    ['perfil herdado do Object', { profile: 'constructor' }],
    ['sem curso (UniCatólica)', { course: '' }],
    ['curso curto', { course: 'TI' }],
    ['curso longo', { course: 'x'.repeat(81) }],
    ['curso com símbolo de código', { course: 'Engenharia {de} Software' }],
    ['sem período (quem estuda)', { period: '' }],
    ['período zero', { period: 0 }],
    ['período acima de 10', { period: 11 }],
    ['período quebrado', { period: 2.5 }],
    ['matrícula curta', { studentId: '123' }],
    ['matrícula com símbolo', { studentId: '2024#100' }],
    ['instituição curta (outra instituição)', { ...OTHER, institution: 'X' }],
    ['instituição com símbolo', { ...OTHER, institution: 'Faculdade <b>' }],
    ['formado sem curso', { ...GRADUATE, course: '' }],
    ['formado sem área', { ...GRADUATE, area: '' }],
    ['área fora da lista', { ...SELF_TAUGHT, area: 'marketing' }],
    ['sem resposta da idade', { adult: undefined }],
    ['idade como texto', { adult: 'yes' }],
  ])('recusa %s', (_case, participant) => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody(participant))).toEqual({ ok: false, error: 'invalid' });
    expect(script.book.sheets).toHaveLength(0);
  });

  it.each([
    ['sem participant', { participant: undefined }],
    ['participant que é lista', { participant: [] }],
    ['sem versão do consentimento', { consentVersion: '' }],
    ['aceite de uma versão antiga do aviso', { consentVersion: '2026-10-v3' }],
    ['consentimento com data torta', { consentAt: 'ontem' }],
  ])('recusa envio %s', (_case, overrides) => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody({}, overrides))).toEqual({ ok: false, error: 'invalid' });
  });

  it.each(['=', '+', '-', '@'])('neutraliza fórmula começando com "%s" (sheetSafe_)', (prefix) => {
    const payload = `${prefix}HYPERLINK("https://exemplo.com")`;
    const { script } = saved({}, { source: payload.slice(0, 40) });
    const cells = script.registrations.data[0] ?? [];
    const texts = cells.filter((v): v is string => typeof v === 'string');
    expect(texts.filter((v) => /^[=+\-@]/.test(v))).toEqual([]);
    expect(cells).toContain(`'${payload.slice(0, 40)}`);
  });

  it('e-mail e matrícula começando com sinal são aceitos e gravados como texto puro', () => {
    const { row } = saved({ email: '+ana@exemplo.com', studentId: '-2024' });
    expect(row).toMatchObject({ 'E-mail': "'+ana@exemplo.com", Matrícula: "'-2024" });
  });

  it.each([
    ['honeypot preenchido', { honeypot: 'https://spam.example' }],
    ['enviado rápido demais', { elapsedMs: 900 }],
    ['sem tempo de preenchimento', { elapsedMs: undefined }],
  ])('barra robô: %s', (_case, overrides) => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody({}, overrides))).toEqual({ ok: false, error: 'invalid' });
    expect(script.cache.store.size).toBe(0);
  });

  it('corpo que não é objeto JSON é recusado', () => {
    const script = new AppsScriptSandbox();
    expect(script.postRaw('nada')).toEqual({ ok: false, error: 'invalid' });
    expect(script.postRaw('[1,2]')).toEqual({ ok: false, error: 'invalid' });
  });
});

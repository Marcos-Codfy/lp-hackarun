// cadastro de mentores no Apps Script: a aba Mentores e as inscrições que ficam intactas
// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  AppsScriptSandbox,
  KEY,
  mentorBody,
  otherMentor,
  person,
  registrationBody,
} from '../../helpers/apps-script/sandbox';
import { MENTOR_TITLES, mentors, rowsOf, seeded, snapshot } from '../../helpers/apps-script/mentorSheet';

describe('Apps Script · cadastro de mentores', () => {
  it('grava o mentor na aba Mentores, que nasce no primeiro cadastro, com os rótulos em pt-BR', () => {
    const script = new AppsScriptSandbox();
    const res = script.post(mentorBody());
    expect(res.ok).toBe(true);
    expect(res.protocol).toMatch(/^MT26-[A-HJ-NP-Z2-9]{6}$/);
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Mentores', 'Resumo Mentores']);
    expect(mentors(script).rows[0]).toEqual(MENTOR_TITLES);
    expect(script.properties['MENTORES_VERSAO']).toBe('1');
    expect(rowsOf(script)).toHaveLength(1);
    expect(rowsOf(script)[0]).toMatchObject({
      Protocolo: res.protocol,
      'Nome completo': 'Ana Souza',
      'E-mail': 'ana.mentora@exemplo.com',
      WhatsApp: '(63) 99999-0101',
      'Área de atuação': 'Cibersegurança',
      'Qual área (outra)': '',
      Especialidades: 'Pentest, AWS',
      'Egresso da UniCatólica': 'Sim',
      Curso: 'Engenharia de Software',
      'Ano de formatura': '2019',
      'LinkedIn ou site': 'https://www.linkedin.com/in/ana-souza',
      'Dias disponíveis': '13/11 (sex), 14/11 (sáb)',
      'Pode divulgar no site': 'Sim',
      Status: 'novo',
      Origem: 'mentor-page',
      Consentimento: '2026-10-m1 · 2026-10-27T15:00:00.000Z',
    });
    expect(script.errors).toEqual([]);
  });

  it('a coluna Conversar é uma fórmula que lê o WhatsApp da mesma linha', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody());
    const formula = mentors(script).formulaAt(2, 6) ?? '';
    expect(formula).toContain('HYPERLINK');
    expect(formula).toContain('E2');
    expect(formula).toContain('wa.me/55');
  });

  it('não-egresso sai com curso e ano vazios; opcionais vazios saem vazios', () => {
    const script = new AppsScriptSandbox();
    script.post(
      mentorBody({
        graduate: false,
        course: 'qualquer coisa',
        graduationYear: 2001,
        specialties: '',
        linkedin: '',
        mayPublish: false,
        days: ['12'],
      }),
    );
    expect(rowsOf(script)[0]).toMatchObject({
      'Egresso da UniCatólica': 'Não',
      Curso: '',
      'Ano de formatura': '',
      Especialidades: '',
      'LinkedIn ou site': '',
      'Pode divulgar no site': 'Não',
      'Dias disponíveis': '12/11 (qui)',
    });
  });

  it('área "outra" grava o texto que a pessoa escreveu; nas demais áreas o campo sai vazio', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody({ area: 'other', areaOther: 'Computação quântica' }));
    script.post(otherMentor(2, { area: 'design', areaOther: 'sobrou no campo escondido' }));
    const [outra, design] = rowsOf(script);
    expect(outra).toMatchObject({ 'Área de atuação': 'Outra', 'Qual área (outra)': 'Computação quântica' });
    expect(design).toMatchObject({ 'Área de atuação': 'Design e UX', 'Qual área (outra)': '' });
  });

  it('endereço sem https vira https e os dias saem na ordem do evento, sem repetir', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody({ linkedin: 'linkedin.com/in/ana', days: ['14', '12', '14', '13'] }));
    expect(rowsOf(script)[0]).toMatchObject({
      'LinkedIn ou site': 'https://linkedin.com/in/ana',
      'Dias disponíveis': '12/11 (qui), 13/11 (sex), 14/11 (sáb)',
    });
  });

  it('e-mail em caixa alta e WhatsApp com +55 saem normalizados', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody({ email: ' Ana.Mentora@Exemplo.COM ', whatsapp: '+55 63 99999-0101' }));
    expect(rowsOf(script)[0]).toMatchObject({
      'E-mail': 'ana.mentora@exemplo.com',
      WhatsApp: '(63) 99999-0101',
    });
  });

  it('texto que começa com + ou - vira texto puro na planilha (sem fórmula injetada)', () => {
    const script = new AppsScriptSandbox();
    script.post(mentorBody({ area: 'other', areaOther: '-área', specialties: '+React' }));
    expect(rowsOf(script)[0]).toMatchObject({
      'Qual área (outra)': "'-área",
      Especialidades: "'+React",
    });
  });
});

describe('Apps Script · cadastro de mentores não mexe nas inscrições', () => {
  it('as abas Inscritos e Equipes ficam idênticas depois de vários cadastros', () => {
    const { script, before } = seeded();
    expect(script.post(mentorBody()).ok).toBe(true);
    expect(script.post(otherMentor(2)).ok).toBe(true);
    expect(script.post(otherMentor(3)).ok).toBe(true);
    expect(snapshot(script)).toBe(before);
    expect(script.properties['PLANILHA_VERSAO']).toBe('7');
    expect(script.book.sheets.map((s) => s.name)).toEqual([
      'Inscritos',
      'Equipes',
      'Mentores',
      'Resumo Mentores',
    ]);
  });

  it('a inscrição de participante continua entrando em Inscritos, antes e depois dos mentores', () => {
    const { script } = seeded();
    script.post(mentorBody());
    // outra pessoa: a Ana (corpo padrão) já está na planilha-semente
    const res = script.post({ ...person(9), idempotencyKey: KEY });
    expect(res.ok).toBe(true);
    expect(res.protocol).toMatch(/^HR26-/);
    expect(script.registrations.data).toHaveLength(3);
    expect(rowsOf(script)).toHaveLength(1);
    // e o contador de vagas só conta inscrições, nunca mentores
    expect(script.get('slots').taken).toBe(3);
  });

  it('antes do primeiro mentor a planilha não ganha nenhuma aba nova', () => {
    const { script } = seeded();
    script.post(registrationBody({}, { idempotencyKey: KEY }));
    expect(script.book.sheets.map((s) => s.name)).toEqual(['Inscritos', 'Equipes']);
  });

  it('a mesma pessoa pode ser participante e mentora (e-mail e WhatsApp iguais não conflitam entre as abas)', () => {
    const { script } = seeded();
    const email = 'ana@exemplo.com';
    const whatsapp = '(63) 99999-0001';
    expect(script.post(mentorBody({ email, whatsapp })).ok).toBe(true);
    expect(script.post(person(7, { email: 'novo@exemplo.com' })).ok).toBe(true);
  });

  it('inscrições fechadas ou lotadas não fecham os mentores', () => {
    const script = new AppsScriptSandbox();
    script.properties['INSCRICOES_FECHADAS'] = 'sim';
    expect(script.post(registrationBody()).error).toBe('closed');
    expect(script.post(mentorBody()).ok).toBe(true);
  });
});

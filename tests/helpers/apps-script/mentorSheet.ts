// apoio dos testes do cadastro de mentores no Apps Script: títulos da aba, leitura das linhas e a planilha das
// inscrições já com gente dentro (que os mentores não podem mexer)
import type { FakeSheet } from './sheetFakes';
import { AppsScriptSandbox, type Row } from './sandbox';

export const MENTOR_TITLES = [
  'Protocolo',
  'Data/hora',
  'Nome completo',
  'E-mail',
  'WhatsApp',
  'Conversar',
  'Área de atuação',
  'Especialidades',
  'Cargo',
  'Empresa',
  'Experiência',
  'Egresso da UniCatólica',
  'Curso',
  'Ano de formatura',
  'LinkedIn ou site',
  'Dias disponíveis',
  'Formato',
  'Como prefere atuar',
  'Observações',
  'Pode divulgar no site',
  'Status',
  'Equipe(s) atendida(s)',
  'Anotações da organização',
  'Origem',
  'Consentimento',
  'Chave de envio',
];

export const mentors = (script: AppsScriptSandbox): FakeSheet => script.tab('Mentores');
export const rowsOf = (script: AppsScriptSandbox): Row[] =>
  mentors(script).data.map((_, i) => script.row(mentors(script), i));

// planilha das inscrições já com gente dentro (o que não pode ser mexido)
export function seeded(): { script: AppsScriptSandbox; before: string } {
  const script = new AppsScriptSandbox();
  const ana = {
    Protocolo: 'HR26-AAAAAA',
    'Nome completo': 'Ana Souza',
    'E-mail': 'ana@exemplo.com',
    WhatsApp: '(63) 99999-0001',
    Perfil: 'Estuda na UniCatólica',
    Status: 'inscrito',
  };
  const bia = {
    ...ana,
    Protocolo: 'HR26-BBBBBB',
    'Nome completo': 'Bia Lima',
    'E-mail': 'bia@exemplo.com',
    WhatsApp: '(63) 99999-0002',
  };
  script.seed([ana, bia], [{ Equipe: 'Equipe Pikachu', Status: 'pendente' }]);
  return { script, before: snapshot(script) };
}

// tudo que existe nas abas das inscrições (dados, formatação e fórmulas): igual antes e depois dos mentores
export function snapshot(script: AppsScriptSandbox): string {
  return JSON.stringify(
    ['Inscritos', 'Equipes'].map((name) => {
      const sheet = script.tab(name);
      return {
        rows: sheet.rows,
        calls: sheet.calls.length,
        formulas: [...sheet.formulas.entries()],
        validations: sheet.validations.length,
        protections: sheet.protections.length,
        bandings: sheet.bandings.length,
        widths: [...sheet.columnWidths.entries()],
      };
    }),
  );
}

// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { AppsScriptSandbox, MEMBER_A, MEMBER_B, registrationBody } from '../../helpers/apps-script/sandbox';

// equipe cheia (5), com matrícula e e-mail que começam com sinal: na célula vão como texto, sem apóstrofo
const FULL_TEAM = [
  MEMBER_A,
  MEMBER_B,
  { name: 'Carla Dias', studentId: '-2024', email: '+carla@exemplo.com' },
  { name: 'Davi Rocha', studentId: 'ra-0004', email: 'Davi@Exemplo.com' },
  { name: "Elisa D'Ávila", studentId: '2024.0005', email: 'elisa@exemplo.com' },
];

describe('Apps Script · coluna Integrantes na aba Equipes', () => {
  it('fica logo depois do Status e lista um integrante por linha, na ordem da inscrição, o 1 como contato', () => {
    const script = new AppsScriptSandbox();
    expect(script.post(registrationBody({ members: FULL_TEAM })).ok).toBe(true);
    const headers = script.teams.rows[0] ?? [];
    expect(headers.indexOf('Integrantes')).toBe(headers.indexOf('Status') + 1);
    const row = script.row(script.teams, 0);
    expect(row['Integrantes']).toBe(
      [
        '1. Ana Souza · 2024100123 · ana@exemplo.com (contato)',
        '2. Bruno Lima · 2024100456 · bruno@exemplo.com',
        '3. Carla Dias · -2024 · +carla@exemplo.com',
        '4. Davi Rocha · RA-0004 · davi@exemplo.com',
        "5. Elisa D'Ávila · 2024.0005 · elisa@exemplo.com",
      ].join('\n'),
    );
    // as colunas que já existiam continuam iguais
    expect(row).toMatchObject({
      Status: 'pendente',
      'Integrantes (qtd)': 5,
      'E-mail de contato': 'ana@exemplo.com',
      'E-mails da equipe':
        'ana@exemplo.com; bruno@exemplo.com; +carla@exemplo.com; davi@exemplo.com; elisa@exemplo.com',
    });
    // texto puro: nada de fórmula na célula
    expect(script.teams.formulaAt(2, headers.indexOf('Integrantes') + 1)).toBeUndefined();
  });

  it('é texto com quebra automática, 520 px e fonte 9; a linha da equipe pede a altura da foto (84 px)', () => {
    const script = new AppsScriptSandbox();
    script.evaluate<() => unknown>('configurarPlanilha')();
    const calls = script.teams.calls.filter((c) => c.a1 === 'G2:G1000').map((c) => [c.method, ...c.args]);
    expect(calls).toEqual([
      ['setVerticalAlignment', 'middle'],
      ['setNumberFormat', '@'],
      ['setWrap', true],
      ['setFontSize', 9],
    ]);
    expect(script.teams.columnWidths.get(7)).toBe(520);
    script.post(registrationBody({ members: FULL_TEAM }));
    expect(script.teams.rowHeights.get(2)).toBe(84);
  });

  it('cada inscrição preenche a própria linha (a de baixo não mexe na de cima)', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody());
    script.post(
      registrationBody({
        teamName: 'Os Brabos',
        members: [
          { name: 'Carla Dias', studentId: 'RA-0001', email: 'carla@exemplo.com' },
          { name: 'Davi Rocha', studentId: 'RA-0002', email: 'davi@exemplo.com' },
        ],
      }),
    );
    expect(script.teams.data.map((_, i) => script.row(script.teams, i)['Integrantes'])).toEqual([
      '1. Ana Souza · 2024100123 · ana@exemplo.com (contato)\n2. Bruno Lima · 2024100456 · bruno@exemplo.com',
      '1. Carla Dias · RA-0001 · carla@exemplo.com (contato)\n2. Davi Rocha · RA-0002 · davi@exemplo.com',
    ]);
  });
});

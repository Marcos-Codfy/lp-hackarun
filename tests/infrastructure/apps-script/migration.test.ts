// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  LEGACY_TEAMS,
  PHOTO_B,
  ROSTER_A,
  ROSTER_B,
  configure,
  legacyBook,
  ruleRanges,
} from '../../helpers/apps-script/legacyLayout';
import { otherTeam, registrationBody } from '../../helpers/apps-script/sandbox';
import type { FakeSheet } from '../../helpers/apps-script/sheetFakes';

// o que o teste compara entre uma rodada e outra: valores e fórmulas
const snapshot = (sheet: FakeSheet) => JSON.stringify([sheet.rows, [...sheet.formulas].sort()]);
const callsOn = (sheet: FakeSheet, a1: string) =>
  sheet.calls.filter((c) => c.a1 === a1).map((c) => [c.method, ...c.args]);

describe('Apps Script · migração da aba Equipes pra coluna Integrantes', () => {
  it('insere a coluna depois do Status (os dados andam junto) e preenche pela aba Integrantes, em ordem de Nº', () => {
    const { script, teams } = legacyBook();
    configure(script);
    expect(teams.insertedAfter).toEqual([6]);
    const headers = teams.rows[0] ?? [];
    expect(headers).toEqual(script.evaluate('TEAM_HEADERS'));
    expect(headers.indexOf('Integrantes')).toBe(headers.indexOf('Status') + 1);
    expect(script.row(teams, 0)).toMatchObject({ ...LEGACY_TEAMS[0], Integrantes: ROSTER_A });
    expect(script.row(teams, 1)).toMatchObject({ ...LEGACY_TEAMS[1], Integrantes: ROSTER_B });
    expect(teams.data.every((row) => row.length === 14)).toBe(true);
    expect(script.properties['PLANILHA_VERSAO']).toBe(script.evaluate('SETUP_VERSION'));
  });

  it('foto, link, Status dos integrantes e o Resumo apontam pras colunas novas (em pt_BR)', () => {
    const { script, teams, members, summary } = legacyBook();
    configure(script);
    expect(teams.formulaAt(3, 5)).toBe(
      '=IF(K3="";"";IMAGE("https://lh3.googleusercontent.com/d/"&K3&"=w240"))',
    );
    expect(teams.formulaAt(3, 10)).toBe(
      '=IF(K3="";"";HYPERLINK("https://drive.google.com/file/d/"&K3&"/view";"Abrir no Drive"))',
    );
    // na coluna I agora ficam os e-mails da equipe (valor, não fórmula)
    expect(teams.formulaAt(3, 9)).toBeUndefined();
    expect(members.formulaAt(5, 8)).toBe(
      "=IFERROR(INDEX('Equipes'!$F:$F;MATCH($A5;'Equipes'!$A:$A;0));\"\")",
    );
    expect(summary.formulaAt(5, 2)).toBe("=COUNTA('Equipes'!A2:A)");
    expect(summary.formulaAt(6, 2)).toBe('=COUNTIF(\'Equipes\'!F2:F;"confirmado")');
    expect(summary.formulaAt(9, 2)).toBe("=SUM('Equipes'!D2:D)");
    expect(summary.formulaAt(14, 2)).toContain("FILTER('Equipes'!I2:I;");
  });

  it('filtro, faixas, aviso dos títulos e cores passam a cobrir a coluna nova; ela é formatada do zero', () => {
    const { script, teams } = legacyBook();
    expect(teams.filter?.a1).toBe('A1:M1000');
    teams.calls.length = 0;
    configure(script);
    expect(teams.filter?.a1).toBe('A1:N1000');
    expect(teams.bandings.map((b) => b.a1)).toEqual(['A1:N1000']);
    expect(teams.getProtections('RANGE').map((p) => p.a1)).toEqual(['A1:N1']);
    expect(ruleRanges(teams)).toEqual([['F2:F1000'], ['F2:F1000'], ['F2:F1000'], ['A2:N1000']]);
    // o menu e o formato que a coluna herdou do Status saem antes da formatação dela
    expect(callsOn(teams, 'G2:G1000')).toEqual([
      ['clearDataValidations'],
      ['clearFormat'],
      ['setVerticalAlignment', 'middle'],
      ['setNumberFormat', '@'],
      ['setWrap', true],
      ['setFontSize', 9],
    ]);
    expect(teams.columnWidths.get(7)).toBe(520);
    expect(teams.rowHeights.get(3)).toBe(84);
  });

  it('rodar de novo não insere outra coluna nem mexe nos dados', () => {
    const { script, teams, members } = legacyBook();
    configure(script);
    const before = [snapshot(teams), snapshot(members)];
    configure(script);
    expect(teams.insertedAfter).toEqual([6]);
    expect([snapshot(teams), snapshot(members)]).toEqual(before);
    expect(teams.conditionalRules).toHaveLength(4);
    expect(teams.bandings).toHaveLength(1);
    expect(teams.protections).toHaveLength(1);
  });

  it('sem rodar o configurarPlanilha, a próxima inscrição migra sozinha e entra alinhada', () => {
    const { script, teams } = legacyBook();
    const res = script.post(otherTeam(3));
    expect(res.ok).toBe(true);
    expect(teams.insertedAfter).toEqual([6]);
    expect(script.row(teams, 0)).toMatchObject({ Equipe: 'Bug Busters', Integrantes: ROSTER_A });
    expect(script.row(teams, 2)).toMatchObject({
      Protocolo: res.protocol,
      Equipe: 'Equipe 3',
      Status: 'pendente',
      Integrantes:
        '1. Alice Moreira · RA0003-1 · p1.equipe3@exemplo.com (contato)\n' +
        '2. Bento Carvalho · RA0003-2 · p2.equipe3@exemplo.com',
      'E-mail de contato': 'p1.equipe3@exemplo.com',
      'E-mails da equipe': 'p1.equipe3@exemplo.com; p2.equipe3@exemplo.com',
      'ID da foto': script.drive.allFiles[0]?.id,
    });
    expect(teams.formulaAt(4, 5)).toContain('IMAGE("https://lh3.googleusercontent.com/d/"&K4&');
  });

  it('depois da migração, duplicados, lista pública e o onEdit leem as colunas certas', () => {
    const { script, teams } = legacyBook();
    configure(script);
    expect(script.post(registrationBody())).toMatchObject({ error: 'duplicate_team_name' });
    const res = script.post(registrationBody({ teamName: 'Outra Equipe' }));
    expect(res).toEqual({ ok: false, error: 'duplicate_email', members: [0, 1] });
    expect(script.get('teams').teams).toEqual([
      expect.objectContaining({ name: 'Os Brabos', memberCount: 2, imageId: PHOTO_B }),
    ]);
    const onEdit = script.evaluate<(e: unknown) => void>('onEdit');
    const edit = (col: number) =>
      onEdit({ range: { getSheet: () => teams, getColumn: () => col, getLastColumn: () => col } });
    // a coluna Integrantes não é pública; o ID da foto (agora em K) é
    edit(7);
    expect(script.cache.store.has('teams:v3')).toBe(true);
    edit(11);
    expect(script.cache.store.has('teams:v3')).toBe(false);
  });
});

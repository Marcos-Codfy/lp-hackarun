// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  LEGACY_TEAMS,
  PHOTO_A,
  PHOTO_B,
  ROSTER_A,
  ROSTER_B,
  configure,
  legacyBook,
  ruleRanges,
} from '../../helpers/apps-script/legacyLayout';
import { AppsScriptSandbox, otherTeam } from '../../helpers/apps-script/sandbox';
import { FakeSheet, type Cell } from '../../helpers/apps-script/sheetFakes';

type Builder = {
  whenFormulaSatisfied(formula: string): Builder;
  setRanges(ranges: unknown[]): Builder;
  build(): unknown;
};

describe('Apps Script · migração da coluna Integrantes: casos de borda', () => {
  it('célula Integrantes apagada é refeita pelo configurar; a que a organização escreveu fica', () => {
    const { script, teams } = legacyBook();
    configure(script);
    (teams.rows[1] as Cell[])[6] = '';
    (teams.rows[2] as Cell[])[6] = 'anotação da organização';
    // linha com protocolo que não tem ninguém na aba Integrantes fica vazia
    teams.appendRow(
      script.evaluate<string[]>('TEAM_HEADERS').map((h) => (h === 'Protocolo' ? 'HR26-SOZINH' : '')),
    );
    configure(script);
    expect(script.row(teams, 0)['Integrantes']).toBe(ROSTER_A);
    expect(script.row(teams, 1)['Integrantes']).toBe('anotação da organização');
    expect(script.row(teams, 2)['Integrantes']).toBe('');
  });

  it('caiu logo depois de inserir a coluna: rodar de novo termina a migração sem inserir outra', () => {
    const { script, teams } = legacyBook();
    const maxRows = teams.getMaxRows;
    teams.getMaxRows = () => {
      throw new Error('Service Spreadsheets timed out');
    };
    expect(() => configure(script)).toThrow('timed out');
    expect(script.lock.held).toBe(false);
    teams.getMaxRows = maxRows;
    configure(script);
    expect(teams.insertedAfter).toEqual([6]);
    expect(teams.rows[0]).toEqual(script.evaluate('TEAM_HEADERS'));
    expect(script.row(teams, 1)).toMatchObject({ ...LEGACY_TEAMS[1], Integrantes: ROSTER_B });
  });

  it('configurarPlanilha entra na fila do lock: com uma inscrição gravando, espera e não mexe em nada', () => {
    const { script, teams } = legacyBook();
    script.lock.busy = true;
    expect(() => configure(script)).toThrow();
    expect(teams.insertedAfter).toEqual([]);
    expect(script.properties['PLANILHA_VERSAO']).toBe('5');
  });

  it('configurarPlanilha grava tudo na planilha (flush) antes de soltar o lock', () => {
    const { script } = legacyBook();
    configure(script);
    expect(script.flushes).toEqual([true]);
  });

  it('coluna "Integrantes" que a organização criou no fim não impede a migração', () => {
    const { script, teams } = legacyBook();
    teams.getRange(1, 14).setValue('Integrantes');
    configure(script);
    expect(teams.insertedAfter).toEqual([6]);
    expect(script.row(teams, 0)['ID da foto']).toBe(PHOTO_A);
    // dois títulos "Integrantes": o da coluna nova (G) e o da organização, que andou junto com o resto (O)
    expect(teams.rows[0]?.[14]).toBe('Integrantes');
    expect(teams.rows[1]?.[6]).toBe(ROSTER_A);
  });

  it('inscrição que esperou na fila enquanto a da frente migrava não refaz a formatação', () => {
    const { script, teams } = legacyBook();
    const wait = script.lock.waitLock.bind(script.lock);
    // a config desta inscrição foi lida antes do lock (versão 5); a da frente migra enquanto ela espera
    script.lock.waitLock = () => {
      script.evaluate('setupBook_(SpreadsheetApp.getActiveSpreadsheet(), readConfig_())');
      teams.calls.length = 0;
      wait();
    };
    expect(script.post(otherTeam(3)).ok).toBe(true);
    expect(teams.insertedAfter).toEqual([6]);
    expect(teams.calls).toEqual([]);
  });

  it('a lista pública lida com o layout antigo sai do cache quando a planilha migra', () => {
    const { script } = legacyBook();
    // versão nova publicada e o configurarPlanilha ainda não rodou: o ID da foto ainda está em J
    const brabos = (imageId: string | null) => [expect.objectContaining({ name: 'Os Brabos', imageId })];
    expect(script.get('teams').teams).toEqual(brabos(null));
    configure(script);
    expect(script.get('teams').teams).toEqual(brabos(PHOTO_B));
  });

  it('regra de cor do Status esticada pela coluna nova é trocada; a da organização fica', () => {
    const { script, teams } = legacyBook();
    const rule = (formula: string, a1: string) =>
      script
        .evaluate<() => Builder>('SpreadsheetApp.newConditionalFormatRule')()
        .whenFormulaSatisfied(formula)
        .setRanges([teams.getRange(a1)])
        .build();
    const stretched = rule('=LOWER(TRIM($F2))="pendente"', 'F2:G1000');
    const orgRule = rule('=$D2>4', 'D2:D1000');
    teams.setConditionalFormatRules([...teams.conditionalRules, stretched, orgRule]);
    configure(script);
    expect(teams.conditionalRules).toHaveLength(5);
    expect(teams.conditionalRules[0]).toBe(orgRule);
    expect(ruleRanges(teams).flat()).not.toContain('F2:G1000');
  });

  it('aba Equipes que não é do layout 5 (ou já migrada) não ganha coluna inserida', () => {
    const fresh = new AppsScriptSandbox();
    configure(fresh);
    configure(fresh);
    expect(fresh.teams.insertedAfter).toEqual([]);
    const other = new AppsScriptSandbox();
    other.book
      .add(new FakeSheet('Equipes'))
      .appendRow(['Protocolo', 'Data', 'Equipe', 'Qtd', 'Foto', 'Status', 'Obs']);
    configure(other);
    expect(other.teams.insertedAfter).toEqual([]);
  });
});

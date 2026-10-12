// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  AppsScriptSandbox,
  MEMBER_A,
  MEMBER_B,
  otherTeam,
  registrationBody,
} from '../../helpers/apps-script/sandbox';

// segunda equipe com um integrante "emprestado" da primeira na posição `at`
function withBorrowed(member: Record<string, string>, at: number) {
  const body = otherTeam(2);
  const members = [...(body['members'] as Record<string, string>[])];
  members[at] = { ...(members[at] as Record<string, string>), ...member };
  return { ...body, members };
}

describe('Apps Script · cada pessoa e cada nome numa equipe só', () => {
  it.each(['Bug Busters', '  bug   BUSTERS ', 'Bug Bústers'])(
    'nome de equipe já usado ("%s") vira duplicate_team_name',
    (name) => {
      const script = new AppsScriptSandbox();
      script.post(registrationBody());
      expect(script.post(otherTeam(2, { teamName: name }))).toEqual({
        ok: false,
        error: 'duplicate_team_name',
        members: [],
      });
      expect(script.teams.data).toHaveLength(1);
    },
  );

  it('e-mail já inscrito em outra equipe vira duplicate_email com a posição do integrante', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody());
    const res = script.post(withBorrowed({ email: 'BRUNO@exemplo.com' }, 1));
    expect(res).toEqual({ ok: false, error: 'duplicate_email', members: [1] });
    expect(script.members.data).toHaveLength(2);
    expect(script.drive.allFiles).toHaveLength(1);
  });

  it('matrícula já inscrita vira duplicate_student_id (sem diferenciar caixa)', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody({ members: [MEMBER_A, { ...MEMBER_B, studentId: 'RA-2023.044' }] }));
    const res = script.post(withBorrowed({ studentId: 'ra-2023.044' }, 0));
    expect(res).toEqual({ ok: false, error: 'duplicate_student_id', members: [0] });
  });

  it('aponta todos os integrantes repetidos de uma vez', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody());
    const body = otherTeam(2);
    const members = [...(body['members'] as object[]), { ...MEMBER_B }, { ...MEMBER_A }];
    expect(script.post({ ...body, members })).toMatchObject({ error: 'duplicate_email', members: [2, 3] });
  });

  it('equipe recusada libera o nome, os e-mails e as matrículas', () => {
    const script = new AppsScriptSandbox();
    script.post(registrationBody());
    const status = (script.teams.rows[0] ?? []).indexOf('Status');
    (script.teams.data[0] ?? [])[status] = 'Recusado';
    expect(script.post(registrationBody({ idempotencyKey: '9b1d2c3e-0000-4a4a-8b8b-123456789abc' })).ok).toBe(
      true,
    );
    expect(script.teams.data).toHaveLength(2);
  });

  it('integrante sem linha de equipe (gravação que caiu no meio) não segura e-mail nenhum', () => {
    const script = new AppsScriptSandbox();
    script.seed([], [{ Protocolo: 'HR26-ORFAO1', 'E-mail': 'ana@exemplo.com', Matrícula: '2024100123' }]);
    expect(script.post(registrationBody()).ok).toBe(true);
  });

  it('linha pendente da planilha (equipe e integrantes) também conta como inscrita', () => {
    const script = new AppsScriptSandbox();
    script.seed(
      [{ Protocolo: 'HR26-AAAAAA', Equipe: 'Os Brabos', Status: 'pendente' }],
      [{ Protocolo: 'HR26-AAAAAA', Equipe: 'Os Brabos', 'E-mail': 'ana@exemplo.com', Matrícula: '1' }],
    );
    expect(script.post(registrationBody())).toMatchObject({ error: 'duplicate_email', members: [0] });
    expect(script.post(registrationBody({ teamName: 'os brabos' }))).toMatchObject({
      error: 'duplicate_team_name',
    });
  });
});

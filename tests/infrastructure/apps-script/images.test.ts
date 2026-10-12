// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { FakeSheet } from '../../helpers/apps-script/sheetFakes';
import { AppsScriptSandbox, otherTeam, registrationBody } from '../../helpers/apps-script/sandbox';
import { fakeImageBase64, type FakeImageType } from '../../helpers/images';

const KEY = '3f0c9a52-6d1e-4b7a-9c3e-2a5b8d7e1f40';
const image = (mimeType: string, base64: string) => ({ teamImage: { mimeType, base64 } });
const withImage = (type: FakeImageType, size?: number) =>
  registrationBody(image(type, fakeImageBase64(type, size)));

function imageCell(script: AppsScriptSandbox, row = 0): unknown {
  return script.row(script.teams, row)['ID da foto'];
}

// a organização confirma a primeira linha (como na planilha) e o site lê a lista pública
function confirmFirst(script: AppsScriptSandbox): Record<string, unknown>[] {
  const status = (script.teams.rows[0] ?? []).indexOf('Status');
  (script.teams.data[0] ?? [])[status] = 'confirmado';
  return script.get('teams').teams ?? [];
}

describe('Apps Script · foto/logo da equipe', () => {
  it.each(['image/jpeg', 'image/png', 'image/webp'] as const)(
    'grava %s no Drive com link público e o id na coluna ID da foto',
    (type) => {
      const script = new AppsScriptSandbox();
      const res = script.post(withImage(type));
      expect(res.ok).toBe(true);
      const [file] = script.drive.allFiles;
      const ext = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[type];
      expect(file?.getName()).toMatch(new RegExp(`^foto-[0-9a-f-]{36}\\.${ext}$`));
      expect(file?.blob.contentType).toBe(type);
      expect(file?.sharing).toEqual(['ANYONE_WITH_LINK', 'VIEW']);
      expect(imageCell(script)).toBe(file?.id);
    },
  );

  it('o nome do arquivo (visível pelo link público) é sorteado: não sai do protocolo nem do id público', () => {
    const script = new AppsScriptSandbox();
    const res = script.post(withImage('image/webp'));
    const name = script.drive.allFiles[0]?.getName() ?? '';
    // nem o protocolo inteiro nem o código depois do "HR26-"
    expect(name).not.toContain(String(res.protocol).slice(5) || 'protocolo ausente');
    expect(name).not.toContain(String(confirmFirst(script)[0]?.['id']));
  });

  it('o link público é ligado depois de soltar o lock: a fila de inscrições não espera o Drive', () => {
    const script = new AppsScriptSandbox();
    const heldWhileSharing: boolean[] = [];
    script.drive.onShare = () => heldWhileSharing.push(script.lock.held);
    expect(script.post(withImage('image/png')).ok).toBe(true);
    expect(heldWhileSharing).toEqual([false]);
  });

  it('cria a pasta das fotos uma vez só e guarda o id em FOTOS_PASTA_ID', () => {
    const script = new AppsScriptSandbox();
    script.post(withImage('image/png'));
    script.post(otherTeam(2, image('image/jpeg', fakeImageBase64('image/jpeg'))));
    expect(script.drive.folders.size).toBe(1);
    const [folder] = [...script.drive.folders.values()];
    expect(folder?.name).toBe('HackaRun 2026 · Fotos das equipes');
    expect(script.properties['FOTOS_PASTA_ID']).toBe(folder?.id);
    expect(folder?.files).toHaveLength(2);
  });

  it('usa a pasta da propriedade quando ela existe', () => {
    const script = new AppsScriptSandbox();
    const folder = (script.drive.api()['createFolder'] as (name: string) => { id: string })('Pasta da org');
    script.properties['FOTOS_PASTA_ID'] = folder.id;
    script.post(withImage('image/webp'));
    expect(script.drive.folders.size).toBe(1);
    expect(script.drive.folders.get(folder.id)?.files).toHaveLength(1);
  });

  it.each([
    ['sem foto', registrationBody({ teamImage: null })],
    ['tipo fora da lista', registrationBody(image('image/gif', fakeImageBase64('image/png')))],
    [
      'tipo declarado diferente dos bytes',
      registrationBody(image('image/jpeg', fakeImageBase64('image/png'))),
    ],
    [
      'bytes que não são imagem',
      registrationBody(image('image/png', Buffer.alloc(300, 7).toString('base64'))),
    ],
    ['base64 torto', registrationBody(image('image/png', '%%%%' + fakeImageBase64('image/png')))],
    ['acima de 400 KB', withImage('image/jpeg', 400 * 1024 + 3)],
    ['minúscula demais', withImage('image/png', 30)],
    ['tipo herdado do Object', registrationBody(image('constructor', fakeImageBase64('image/png')))],
  ])('recusa equipe com %s, sem tocar no Drive', (_case, body) => {
    const script = new AppsScriptSandbox();
    expect(script.post(body)).toEqual({ ok: false, error: 'invalid' });
    expect(script.drive.allFiles).toHaveLength(0);
    expect(script.book.sheets).toHaveLength(0);
  });

  it('reenvio com a mesma chave devolve o mesmo protocolo e não cria um segundo arquivo', () => {
    const script = new AppsScriptSandbox();
    const attempt = (i: number) =>
      script.post({
        ...withImage('image/webp'),
        idempotencyKey: KEY,
        submittedAt: `2026-10-20T15:0${i}:00Z`,
      });
    const first = attempt(1);
    expect(attempt(2)).toEqual(first);
    // cache expirou: a chave gravada na linha ainda reconhece o envio
    script.cache.store.clear();
    expect(attempt(3)).toEqual(first);
    expect(script.drive.allFiles).toHaveLength(1);
    expect(script.teams.data).toHaveLength(1);
  });

  it('equipe repetida com outra chave não grava foto nenhuma', () => {
    const script = new AppsScriptSandbox();
    script.post({ ...withImage('image/webp'), idempotencyKey: KEY });
    const other = { ...withImage('image/webp'), idempotencyKey: '9b1d2c3e-0000-4a4a-8b8b-123456789abc' };
    expect(script.post(other)).toMatchObject({ ok: false, error: 'duplicate_team_name' });
    expect(script.drive.allFiles).toHaveLength(1);
  });

  it('domínio que bloqueia o link público: a inscrição entra, o log registra e o id fica na planilha', () => {
    const script = new AppsScriptSandbox();
    script.drive.blockSharing = true;
    const res = script.post(withImage('image/png'));
    expect(res.ok).toBe(true);
    const [file] = script.drive.allFiles;
    expect(file?.sharing).toBeNull();
    expect(imageCell(script)).toBe(file?.id);
    expect(script.errors.flat().join(' ')).toMatch(/Compartilhamento da foto bloqueado/);
  });

  it('Drive fora do ar: a inscrição entra sem a foto (ID da foto vazio) e o erro vai pro log', () => {
    const script = new AppsScriptSandbox();
    script.drive.failCreate = true;
    expect(script.post(withImage('image/png')).ok).toBe(true);
    expect(imageCell(script)).toBe('');
    expect(script.errors).toHaveLength(1);
  });

  it('planilha falhou depois da foto: a foto vai pra lixeira e o site recebe "server"', () => {
    const script = new AppsScriptSandbox();
    const { teams } = script.seed([]);
    teams.appendRow = () => {
      throw new Error('Service Spreadsheets failed');
    };
    expect(script.post(withImage('image/png'))).toEqual({ ok: false, error: 'server' });
    expect(script.drive.allFiles.map((f) => f.trashed)).toEqual([true]);
    // os integrantes que entraram antes não seguram nada: a equipe não existe na aba Equipes
    teams.appendRow = FakeSheet.prototype.appendRow;
    expect(script.post(withImage('image/png')).ok).toBe(true);
  });
});

describe('Apps Script · foto na lista pública', () => {
  const seeded = (id: string) => [
    {
      Protocolo: 'HR26-AAAAAA',
      Equipe: 'Com Foto',
      'Integrantes (qtd)': 3,
      Status: 'confirmado',
      'ID da foto': id,
    },
    {
      Protocolo: 'HR26-BBBBBB',
      Equipe: 'Pendente',
      'Integrantes (qtd)': 2,
      Status: 'pendente',
      'ID da foto': id,
    },
  ];

  it('devolve o id da foto só das confirmadas', () => {
    const script = new AppsScriptSandbox();
    script.seed(seeded('1AbCdEfGhIjKlMnOpQrStUvWxYz_-012'));
    expect(script.get('teams').teams).toEqual([
      expect.objectContaining({ name: 'Com Foto', imageId: '1AbCdEfGhIjKlMnOpQrStUvWxYz_-012' }),
    ]);
  });

  it.each(['', 'curto', 'https://evil.example/x.png', '=IMAGE("x")'])(
    'célula ID da foto "%s" vira null',
    (value) => {
      const script = new AppsScriptSandbox();
      script.seed(seeded(value));
      expect(script.get('teams').teams?.[0]?.['imageId']).toBeNull();
    },
  );

  it('apagar o ID da foto (moderação) limpa o cache da lista na hora', () => {
    const script = new AppsScriptSandbox();
    const { teams } = script.seed(seeded('1AbCdEfGhIjKlMnOpQrStUvWxYz_-012'));
    expect(script.get('teams').teams?.[0]?.['imageId']).not.toBeNull();
    const col = script.evaluate<string[]>('TEAM_HEADERS').indexOf('ID da foto');
    (teams.rows[1] ?? [])[col] = '';
    const range = { getSheet: () => teams, getColumn: () => col + 1, getLastColumn: () => col + 1 };
    (script.evaluate('onEdit') as (e: unknown) => void)({ range });
    expect(script.get('teams').teams?.[0]?.['imageId']).toBeNull();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { bytesToBase64, matteFor } from '@infrastructure/image/imageBytes';
import { driveImageUrl } from '@infrastructure/repositories/driveImageUrl';
import { AppsScriptClient } from '@infrastructure/registration/AppsScriptClient';
import { AppsScriptTeamRepository } from '@infrastructure/repositories/AppsScriptTeamRepository';
import { ContentMapper } from '@infrastructure/mappers/ContentMapper';

const DRIVE_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_-012';

// miniatura RGBA de n pixels com a mesma cor
const pixels = (n: number, rgba: [number, number, number, number]) =>
  Array.from({ length: n }, () => rgba).flat();

describe('bytesToBase64', () => {
  it('converte igual ao Buffer, inclusive acima do bloco de 32 KB', () => {
    const small = new Uint8Array([0, 1, 2, 250, 255]);
    expect(bytesToBase64(small)).toBe(Buffer.from(small).toString('base64'));
    const big = Uint8Array.from({ length: 100_000 }, (_, i) => (i * 31) % 256);
    expect(bytesToBase64(big)).toBe(Buffer.from(big).toString('base64'));
  });
});

describe('matteFor (fundo pra logo transparente)', () => {
  it('imagem opaca não ganha fundo', () => {
    expect(matteFor(pixels(100, [10, 10, 10, 255]))).toBeNull();
  });

  it('traço escuro sobre transparente ganha fundo claro', () => {
    expect(matteFor([...pixels(30, [20, 20, 40, 255]), ...pixels(70, [0, 0, 0, 0])])).toBe('light');
  });

  it('traço claro sobre transparente ganha fundo escuro', () => {
    expect(matteFor([...pixels(30, [240, 250, 255, 255]), ...pixels(70, [0, 0, 0, 0])])).toBe('dark');
  });

  it('toda transparente ou vazia não quebra', () => {
    expect(matteFor(pixels(10, [0, 0, 0, 0]))).toBe('dark');
    expect(matteFor([])).toBeNull();
  });
});

describe('driveImageUrl', () => {
  it('id com cara de Drive vira a URL pública do CDN em 600 px', () => {
    expect(driveImageUrl(DRIVE_ID)).toBe(`https://lh3.googleusercontent.com/d/${DRIVE_ID}=w600`);
  });

  it.each([
    null,
    undefined,
    42,
    '',
    'curto',
    `${DRIVE_ID}/../x`,
    'javascript:alert(1)aaaaaaaaaaaa',
    `${DRIVE_ID}?x=1`,
  ])('id torto (%s) vira sem foto', (id) => {
    expect(driveImageUrl(id)).toBeNull();
  });
});

describe('foto na lista ao vivo', () => {
  it('AppsScriptTeamRepository monta a URL a partir do imageId e ignora o resto', async () => {
    const body = {
      ok: true,
      teams: [
        { id: 'a', name: 'Com Foto', memberCount: 3, imageId: DRIVE_ID },
        { id: 'b', name: 'Sem Foto', memberCount: 2, imageId: null },
        { id: 'c', name: 'Foto Torta', memberCount: 2, imageId: 'https://evil.example/x.png' },
      ],
    };
    const fetchFn = vi.fn(async () => new Response(JSON.stringify(body)));
    const repo = new AppsScriptTeamRepository(
      new AppsScriptClient('https://script.google.com/x/exec', fetchFn),
    );
    const teams = await repo.list();
    expect(teams.map((t) => t.imageUrl)).toEqual([driveImageUrl(DRIVE_ID), null, null]);
  });

  it('o domínio só aceita https ou data:image no src da foto', () => {
    const team = (imageUrl: string) => ContentMapper.toTeam({ id: 't', name: 'Os Brabos', imageUrl });
    expect(team('https://lh3.googleusercontent.com/d/x=w600').imageUrl).toMatch(/^https:/);
    expect(team('data:image/webp;base64,AAAA').imageUrl).toMatch(/^data:image\/webp/);
    expect(team('javascript:alert(1)').imageUrl).toBeNull();
    expect(team('http://inseguro.example/a.png').imageUrl).toBeNull();
    expect(team('data:text/html;base64,AAAA').imageUrl).toBeNull();
  });
});

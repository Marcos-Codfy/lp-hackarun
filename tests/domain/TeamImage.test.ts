import { describe, expect, it } from 'vitest';
import { TEAM_IMAGE_RULES, TeamImage, TeamRegistration, base64Bytes } from '@domain/index';
import { TEAM_SIZE, teamInput } from '../helpers/fixtures';
import { TEAM_IMAGE, fakeImageBase64 } from '../helpers/images';

const MB = 1024 * 1024;

describe('TeamImage', () => {
  it('aceita JPG, PNG e WebP em base64 e calcula o peso real', () => {
    const image = TeamImage.create(TEAM_IMAGE);
    expect(image.ok && image.value.bytes).toBe(240);
    expect(base64Bytes('QUJD')).toBe(3);
    expect(base64Bytes('QUI=')).toBe(2);
    expect(base64Bytes('QQ==')).toBe(1);
  });

  it.each([
    ['ausente', null, 'Envie uma foto ou a logo da equipe.'],
    ['vazia', { mimeType: 'image/png', base64: '' }, 'Envie uma foto ou a logo da equipe.'],
    ['GIF', { mimeType: 'image/gif', base64: TEAM_IMAGE.base64 }, 'Use uma imagem JPG, PNG ou WebP.'],
    ['base64 torto', { mimeType: 'image/png', base64: 'não é base64' }, 'A imagem não chegou inteira.'],
    ['base64 cortado', { mimeType: 'image/png', base64: 'QUJ' }, 'A imagem não chegou inteira.'],
  ])('recusa imagem %s', (_case, input, message) => {
    const result = TeamImage.create(input);
    expect(!result.ok && result.error).toContain(message);
  });

  it('recusa o que passa do teto do servidor (400 KB)', () => {
    const big = fakeImageBase64('image/jpeg', TEAM_IMAGE_RULES.maxBytes + 3);
    const result = TeamImage.create({ mimeType: 'image/jpeg', base64: big });
    expect(!result.ok && result.error).toMatch(/pesada demais/);
    expect(
      TeamImage.create({ mimeType: 'image/jpeg', base64: fakeImageBase64('image/jpeg', 300 * 1024) }).ok,
    ).toBe(true);
  });

  it('confere o arquivo escolhido antes de abrir: tipo, vazio e até 10 MB', () => {
    expect(TeamImage.checkSource({ type: 'image/heic', size: 1000 })).toMatch(/JPG, PNG ou WebP/);
    expect(TeamImage.checkSource({ type: '', size: 1000 })).toMatch(/JPG, PNG ou WebP/);
    expect(TeamImage.checkSource({ type: 'image/png', size: 0 })).toMatch(/vazio/);
    expect(TeamImage.checkSource({ type: 'image/png', size: 10 * MB + 1 })).toMatch(/10 MB/);
    expect(TeamImage.checkSource({ type: 'image/webp', size: 10 * MB })).toBeNull();
  });

  it('exige pelo menos 200 px no lado menor', () => {
    expect(TeamImage.checkDimensions(1200, 199)).toMatch(/1200 × 199 px/);
    expect(TeamImage.checkDimensions(200, 4000)).toBeNull();
  });
});

describe('TeamRegistration · foto da equipe', () => {
  it('equipe sem foto não passa (erro no campo teamImage)', () => {
    const r = TeamRegistration.create(teamInput({ teamImage: null }), TEAM_SIZE);
    expect(!r.ok && r.error['teamImage']).toBe(TeamImage.MISSING);
  });

  it('equipe com foto guarda a imagem no aggregate', () => {
    const r = TeamRegistration.create(teamInput(), TEAM_SIZE);
    expect(r.ok && r.value.teamImage.mimeType).toBe('image/webp');
  });

  it('sem foto a equipe não entra', () => {
    const r = TeamRegistration.create(teamInput({ teamImage: null }), TEAM_SIZE);
    expect(!r.ok && r.error['teamImage']).toBe(TeamImage.MISSING);
  });
});

import type { PreparedTeamImageDTO } from '@application/index';

// bytes com a assinatura certa de cada formato + enchimento: passa no Images.gs sem precisar de imagem de verdade
const MAGIC: Record<'image/jpeg' | 'image/png' | 'image/webp', number[]> = {
  'image/jpeg': [0xff, 0xd8, 0xff, 0xe0],
  'image/png': [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a],
  'image/webp': [0x52, 0x49, 0x46, 0x46, 0x10, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50],
};

export type FakeImageType = keyof typeof MAGIC;

export function fakeImageBytes(type: FakeImageType, size = 240): Uint8Array {
  const bytes = new Uint8Array(size).fill(0x2a);
  bytes.set(MAGIC[type]);
  return bytes;
}

export const fakeImageBase64 = (type: FakeImageType, size = 240): string =>
  Buffer.from(fakeImageBytes(type, size)).toString('base64');

// o que o domínio e o payload carregam
export const TEAM_IMAGE = { mimeType: 'image/webp' as const, base64: fakeImageBase64('image/webp') };

export function preparedImage(patch: Partial<PreparedTeamImageDTO> = {}): PreparedTeamImageDTO {
  return { ...TEAM_IMAGE, width: 800, height: 600, bytes: 240, ...patch };
}

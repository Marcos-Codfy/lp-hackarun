import { describe, expect, it } from 'vitest';
import {
  IMAGE_PROBLEMS,
  PrepareTeamImage,
  fitWithin,
  type DecodedImage,
  type EncodableImageType,
  type EncodedImage,
  type ImageCodec,
  type ImageSize,
} from '@application/index';

const KB = 1024;
const file = (type = 'image/jpeg', size = 2 * 1024 * KB) => ({ type, size });

interface Call {
  size: ImageSize;
  type: EncodableImageType;
  quality: number;
}

// codec falso: o "peso" de cada tentativa sai de uma função; registra as chamadas
class FakeCodec implements ImageCodec {
  readonly calls: Call[] = [];
  closed = 0;

  constructor(
    private readonly source: { width: number; height: number } | Error,
    private readonly weigh: (call: Call) => number | null = () => 120 * KB,
  ) {}

  async decode(): Promise<DecodedImage> {
    if (this.source instanceof Error) throw this.source;
    return { ...this.source, close: () => this.closed++ };
  }

  async encode(_image: DecodedImage, size: ImageSize, type: EncodableImageType, quality: number) {
    const call = { size, type, quality };
    this.calls.push(call);
    const bytes = this.weigh(call);
    if (bytes === null) return null;
    const encoded: EncodedImage = {
      mimeType: type,
      bytes,
      base64: async () => Buffer.alloc(bytes, 1).toString('base64'),
    };
    return encoded;
  }
}

describe('fitWithin', () => {
  it('reduz pelo lado maior e nunca aumenta', () => {
    expect(fitWithin(4000, 3000, 800)).toEqual({ width: 800, height: 600 });
    expect(fitWithin(1000, 2000, 800)).toEqual({ width: 400, height: 800 });
    expect(fitWithin(640, 480, 800)).toEqual({ width: 640, height: 480 });
  });
});

describe('PrepareTeamImage', () => {
  it('foto grande vira WebP de até 800 px, numa tentativa só', async () => {
    const codec = new FakeCodec({ width: 4032, height: 3024 });
    const result = await new PrepareTeamImage(codec).execute(file());
    expect(result).toMatchObject({ ok: true, value: { mimeType: 'image/webp', width: 800, height: 600 } });
    expect(result.ok && result.value.bytes).toBe(120 * KB);
    expect(codec.calls).toHaveLength(1);
    expect(codec.closed).toBe(1);
  });

  it('baixa a qualidade até caber em 300 KB', async () => {
    const codec = new FakeCodec({ width: 1600, height: 1600 }, ({ quality }) =>
      quality > 0.7 ? 500 * KB : 280 * KB,
    );
    const result = await new PrepareTeamImage(codec).execute(file());
    expect(result.ok).toBe(true);
    expect(codec.calls.map((c) => c.quality)).toEqual([0.86, 0.76, 0.66]);
  });

  it('navegador sem WebP cai pro JPEG', async () => {
    const codec = new FakeCodec({ width: 900, height: 900 }, ({ type }) =>
      type === 'image/webp' ? null : 90 * KB,
    );
    const result = await new PrepareTeamImage(codec).execute(file('image/png'));
    expect(result.ok && result.value.mimeType).toBe('image/jpeg');
  });

  it('encolhe a imagem quando nem a menor qualidade cabe', async () => {
    const codec = new FakeCodec({ width: 800, height: 800 }, ({ size }) =>
      size.width > 700 ? 600 * KB : 250 * KB,
    );
    const result = await new PrepareTeamImage(codec).execute(file());
    expect(result).toMatchObject({ ok: true, value: { width: 640, height: 640 } });
  });

  it('passou da meta mas cabe no teto do servidor: vai a menor tentativa', async () => {
    const codec = new FakeCodec({ width: 800, height: 800 }, ({ quality }) =>
      Math.round(350 * KB + quality * KB),
    );
    const result = await new PrepareTeamImage(codec).execute(file());
    expect(result.ok && result.value.bytes).toBeLessThanOrEqual(400 * KB);
  });

  it('nada coube nem no teto: erro amigável', async () => {
    const codec = new FakeCodec({ width: 800, height: 800 }, () => 900 * KB);
    expect(await new PrepareTeamImage(codec).execute(file())).toEqual({
      ok: false,
      error: IMAGE_PROBLEMS.tooHeavy,
    });
  });

  it.each([
    ['tipo fora da lista', file('image/gif'), /JPG, PNG ou WebP/],
    ['arquivo acima de 10 MB', file('image/jpeg', 11 * 1024 * KB), /10 MB/],
  ])('%s nem chega a abrir', async (_case, source, message) => {
    const codec = new FakeCodec({ width: 800, height: 800 });
    const result = await new PrepareTeamImage(codec).execute(source);
    expect(!result.ok && result.error).toMatch(message);
    expect(codec.calls).toHaveLength(0);
  });

  it('arquivo que não abre (corrompido) vira mensagem amigável', async () => {
    const codec = new FakeCodec(new Error('InvalidStateError'));
    expect(await new PrepareTeamImage(codec).execute(file())).toEqual({
      ok: false,
      error: IMAGE_PROBLEMS.unreadable,
    });
  });

  it('imagem pequena demais é recusada e o bitmap é liberado', async () => {
    const codec = new FakeCodec({ width: 640, height: 150 });
    const result = await new PrepareTeamImage(codec).execute(file());
    expect(!result.ok && result.error).toMatch(/pelo menos 200 px/);
    expect(codec.closed).toBe(1);
    expect(codec.calls).toHaveLength(0);
  });
});

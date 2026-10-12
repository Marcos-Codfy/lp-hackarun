import type {
  DecodedImage,
  EncodableImageType,
  EncodedImage,
  ImageCodec,
  ImageFile,
  ImageSize,
} from '@application/index';
import { MATTE_COLORS, bytesToBase64, matteFor, type Matte } from './imageBytes';

type Canvas = OffscreenCanvas | HTMLCanvasElement;
type Context2D = OffscreenCanvasRenderingContext2D | CanvasRenderingContext2D;

// miniatura que basta pra ver transparência e se o traço é claro ou escuro
const PROBE_SIDE = 48;

class BitmapImage implements DecodedImage {
  readonly bitmap: ImageBitmap;
  // calculado uma vez por imagem, na primeira codificação
  matte: Matte | null | undefined;

  constructor(bitmap: ImageBitmap) {
    this.bitmap = bitmap;
  }

  get width(): number {
    return this.bitmap.width;
  }

  get height(): number {
    return this.bitmap.height;
  }

  close(): void {
    this.bitmap.close();
  }
}

// OffscreenCanvas não trava a página; Safari antigo não tem (ou não dá contexto 2D): cai no <canvas>
function canvas2d(width: number, height: number): { canvas: Canvas; ctx: Context2D } {
  if (typeof OffscreenCanvas !== 'undefined') {
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (ctx) return { canvas, ctx };
  }
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D indisponível');
  return { canvas, ctx };
}

function toBlob(canvas: Canvas, type: string, quality: number): Promise<Blob | null> {
  if (canvas instanceof HTMLCanvasElement) {
    return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
  }
  return canvas.convertToBlob({ type, quality }).catch(() => null);
}

function detectMatte(bitmap: ImageBitmap): Matte | null {
  const { ctx } = canvas2d(PROBE_SIDE, PROBE_SIDE);
  ctx.drawImage(bitmap, 0, 0, PROBE_SIDE, PROBE_SIDE);
  return matteFor(ctx.getImageData(0, 0, PROBE_SIDE, PROBE_SIDE).data);
}

async function openBitmap(file: Blob): Promise<ImageBitmap> {
  try {
    // from-image: foto de celular tirada de lado volta pra posição certa (EXIF)
    return await createImageBitmap(file, { imageOrientation: 'from-image' });
  } catch {
    return createImageBitmap(file);
  }
}

// adapter da porta ImageCodec: createImageBitmap + canvas, tudo no aparelho de quem se inscreve
export class CanvasImageCodec implements ImageCodec {
  async decode(file: ImageFile): Promise<DecodedImage> {
    if (!(file instanceof Blob)) throw new TypeError('Esperava um arquivo');
    return new BitmapImage(await openBitmap(file));
  }

  async encode(
    image: DecodedImage,
    size: ImageSize,
    type: EncodableImageType,
    quality: number,
  ): Promise<EncodedImage | null> {
    if (!(image instanceof BitmapImage)) throw new TypeError('Imagem de outro codec');
    const { canvas, ctx } = canvas2d(size.width, size.height);
    image.matte ??= detectMatte(image.bitmap);
    if (image.matte) {
      ctx.fillStyle = MATTE_COLORS[image.matte];
      ctx.fillRect(0, 0, size.width, size.height);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(image.bitmap, 0, 0, size.width, size.height);
    const blob = await toBlob(canvas, type, quality);
    // quem não gera o formato devolve PNG: conta como "não suportado" e o caso de uso tenta o próximo
    if (!blob || blob.type !== type) return null;
    return {
      mimeType: type,
      bytes: blob.size,
      base64: async () => bytesToBase64(new Uint8Array(await blob.arrayBuffer())),
    };
  }
}

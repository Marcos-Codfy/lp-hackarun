import { TEAM_IMAGE_RULES, TeamImage, fail, ok, type Result } from '@domain/index';
import type { PreparedTeamImageDTO } from '../dto';
import type {
  DecodedImage,
  EncodableImageType,
  EncodedImage,
  ImageCodec,
  ImageFile,
  ImageSize,
} from '../ports/ImageCodec';

// WebP primeiro (menor e guarda bem logo); JPEG quando o navegador não gera WebP
const FORMATS: readonly EncodableImageType[] = ['image/webp', 'image/jpeg'];
const QUALITIES = [0.86, 0.76, 0.66, 0.56];
// nem a menor qualidade coube: encolhe a imagem e tenta de novo
const SCALES = [1, 0.8, 0.64];

export const IMAGE_PROBLEMS = {
  unreadable: 'Não deu pra abrir essa imagem. Tente outra em JPG, PNG ou WebP.',
  tooHeavy: 'Não conseguimos deixar essa imagem leve o bastante. Tente outra.',
} as const;

interface Candidate {
  encoded: EncodedImage;
  size: ImageSize;
}

// cabe no lado maior sem nunca aumentar a imagem
export function fitWithin(width: number, height: number, maxLongSide: number): ImageSize {
  const scale = Math.min(1, maxLongSide / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

const scaled = (size: ImageSize, factor: number): ImageSize => ({
  width: Math.max(1, Math.round(size.width * factor)),
  height: Math.max(1, Math.round(size.height * factor)),
});

const smaller = (a: Candidate | null, b: Candidate): Candidate =>
  a && a.encoded.bytes <= b.encoded.bytes ? a : b;

// foto/logo da equipe: confere o arquivo, abre, redimensiona e comprime até caber no envio
export class PrepareTeamImage {
  private readonly codec: ImageCodec;

  constructor(codec: ImageCodec) {
    this.codec = codec;
  }

  async execute(file: ImageFile): Promise<Result<PreparedTeamImageDTO, string>> {
    const problem = TeamImage.checkSource(file);
    if (problem) return fail(problem);
    let image: DecodedImage;
    try {
      image = await this.codec.decode(file);
    } catch {
      return fail(IMAGE_PROBLEMS.unreadable);
    }
    try {
      const tooSmall = TeamImage.checkDimensions(image.width, image.height);
      return tooSmall ? fail(tooSmall) : await this.compress(image);
    } catch {
      return fail(IMAGE_PROBLEMS.unreadable);
    } finally {
      image.close();
    }
  }

  private async compress(image: DecodedImage): Promise<Result<PreparedTeamImageDTO, string>> {
    const base = fitWithin(image.width, image.height, TEAM_IMAGE_RULES.maxLongSide);
    let best: Candidate | null = null;
    for (const format of FORMATS) {
      const candidate = await this.bestIn(image, base, format);
      if (!candidate) continue;
      if (candidate.encoded.bytes <= TEAM_IMAGE_RULES.targetBytes) return this.toDTO(candidate);
      best = smaller(best, candidate);
    }
    // passou da meta mas cabe no teto do servidor: vai assim mesmo
    if (best && best.encoded.bytes <= TEAM_IMAGE_RULES.maxBytes) return this.toDTO(best);
    return fail(best ? IMAGE_PROBLEMS.tooHeavy : IMAGE_PROBLEMS.unreadable);
  }

  // a primeira tentativa que cabe na meta, ou a menor de todas; null = formato não suportado
  private async bestIn(image: DecodedImage, base: ImageSize, format: EncodableImageType) {
    let best: Candidate | null = null;
    for (const factor of SCALES) {
      const size = scaled(base, factor);
      for (const quality of QUALITIES) {
        const encoded = await this.codec.encode(image, size, format, quality);
        if (!encoded) return best;
        const candidate = { encoded, size };
        if (encoded.bytes <= TEAM_IMAGE_RULES.targetBytes) return candidate;
        best = smaller(best, candidate);
      }
    }
    return best;
  }

  private async toDTO({ encoded, size }: Candidate): Promise<Result<PreparedTeamImageDTO, string>> {
    const base64 = await encoded.base64();
    const checked = TeamImage.create({ mimeType: encoded.mimeType, base64 });
    if (!checked.ok) return fail(checked.error);
    return ok({ mimeType: encoded.mimeType, base64, ...size, bytes: checked.value.bytes });
  }
}

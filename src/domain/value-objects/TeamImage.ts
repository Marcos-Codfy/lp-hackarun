import { ValueObject } from '../shared/ValueObject';
import { fail, ok, type Result } from '../shared/Result';

export type TeamImageType = 'image/jpeg' | 'image/png' | 'image/webp';

// regras da foto/logo da equipe. O teto de envio é o mesmo MAX_IMAGE_BYTES do apps-script/Images.gs (um teste confere)
export const TEAM_IMAGE_RULES = {
  types: ['image/jpeg', 'image/png', 'image/webp'] as readonly TeamImageType[],
  // o arquivo que a pessoa escolhe no aparelho
  maxSourceBytes: 10 * 1024 * 1024,
  minShortSide: 200,
  // o que sobe pro servidor, depois de redimensionar no navegador
  maxLongSide: 800,
  targetBytes: 300 * 1024,
  maxBytes: 400 * 1024,
} as const;

export interface TeamImageInput {
  mimeType: string;
  base64: string;
}

const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/;
const MB = 1024 * 1024;

export const isTeamImageType = (type: string): type is TeamImageType =>
  TEAM_IMAGE_RULES.types.includes(type as TeamImageType);

// tamanho real do arquivo a partir do base64, sem decodificar
export function base64Bytes(base64: string): number {
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}

// mensagens em pt-BR porque vão direto pro formulário
export class TeamImage extends ValueObject<{ mimeType: TeamImageType; base64: string }> {
  static readonly MISSING = 'Envie uma foto ou a logo da equipe.';

  static create(input: TeamImageInput | null | undefined): Result<TeamImage, string> {
    if (!input?.base64) return fail(TeamImage.MISSING);
    if (!isTeamImageType(input.mimeType)) return fail('Use uma imagem JPG, PNG ou WebP.');
    if (input.base64.length % 4 !== 0 || !BASE64.test(input.base64)) {
      return fail('A imagem não chegou inteira. Escolha de novo.');
    }
    if (base64Bytes(input.base64) > TEAM_IMAGE_RULES.maxBytes) {
      return fail('A imagem ficou pesada demais. Escolha outra.');
    }
    return ok(new TeamImage({ mimeType: input.mimeType, base64: input.base64 }));
  }

  // o arquivo escolhido, antes de abrir: tipo e peso
  static checkSource(file: { type: string; size: number }): string | null {
    if (!isTeamImageType(file.type)) return 'Use uma imagem JPG, PNG ou WebP.';
    if (file.size <= 0) return 'Esse arquivo está vazio. Escolha outra imagem.';
    if (file.size > TEAM_IMAGE_RULES.maxSourceBytes) {
      return `A imagem passa de ${TEAM_IMAGE_RULES.maxSourceBytes / MB} MB. Escolha uma mais leve.`;
    }
    return null;
  }

  // depois de abrir: resolução mínima pra não virar borrão no card
  static checkDimensions(width: number, height: number): string | null {
    const min = TEAM_IMAGE_RULES.minShortSide;
    if (Math.min(width, height) >= min) return null;
    return `A imagem é pequena demais (${width} × ${height} px). O lado menor precisa ter pelo menos ${min} px.`;
  }

  get mimeType(): TeamImageType {
    return this.props.mimeType;
  }

  get base64(): string {
    return this.props.base64;
  }

  get bytes(): number {
    return base64Bytes(this.props.base64);
  }
}

import type { PartnerDTO } from '@application/index';

// regras da faixa "Quem faz acontecer", sem imagem nenhuma (dá pra testar fora do Astro)
type PartnerRole = PartnerDTO['role'];

export type PartnerTone = 'blue' | 'violet' | 'gold';

// rótulo do papel (o eyebrow acima da logo) e o tom: realização ciano, organização violeta, parceria dourada
export const PARTNER_ROLES: Readonly<Record<PartnerRole, { label: string; tone: PartnerTone }>> = {
  organizer: { label: 'Realização', tone: 'blue' },
  coorganizer: { label: 'Organização', tone: 'violet' },
  partner: { label: 'Parceria', tone: 'gold' },
  supporter: { label: 'Apoio', tone: 'gold' },
};

// legenda e texto alternativo: a sigla (LAES) ganha o nome por extenso do partners.json nos dois
export function partnerCopy(
  partner: Pick<PartnerDTO, 'name' | 'fullName'>,
  brand: { caption?: string },
): { caption: string; alt: string } {
  return {
    caption: brand.caption ?? partner.fullName ?? '',
    alt: partner.fullName ? `${partner.name} · ${partner.fullName}` : partner.name,
  };
}

// tamanho do PNG e a caixa onde de fato tem desenho (px da imagem original)
export interface ImageSize {
  width: number;
  height: number;
}

export interface InkBox extends ImageSize {
  x: number;
  y: number;
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/* variáveis da logo na faixa. --h é a altura do desenho em rem (no desktop); a imagem cresce na proporção (--k)
   e as margens negativas descontam a borda transparente do PNG, então centralizar e alinhar usa só o desenho
   (o PNG da LAES tem bem mais folga em cima que embaixo) */
export function markVars(image: ImageSize, ink: InkBox, heightRem: number): string {
  const unit = (px: number) => round(px / ink.height);
  const right = image.width - ink.x - ink.width;
  const bottom = image.height - ink.y - ink.height;
  return [
    `--h: ${heightRem}rem`,
    `--k: ${unit(image.height)}`,
    `--mt: ${-unit(ink.y)}`,
    `--mr: ${-unit(right)}`,
    `--mb: ${-unit(bottom)}`,
    `--ml: ${-unit(ink.x)}`,
  ].join('; ');
}

// largura da imagem inteira (com a borda transparente) quando o desenho tem heightRem de altura
export function markWidthRem(image: ImageSize, ink: InkBox, heightRem: number): number {
  return round((heightRem * image.width) / ink.height);
}

import type { ImageMetadata } from 'astro';
import unicatolicaLogo from '../../../assets/brand/unicatolica-white.png';
import laesLogo from '../../../assets/brand/laes-white.png';
import capimLogo from '../../../assets/brand/capim-dourado-white.png';
import { courseNames } from '@presentation/sections/hero/courseLockup';
import type { InkBox } from './partnerMarks';

// identidade de cada parceiro na faixa, pelo id do partners.json: logo branca oficial, legenda e tamanho ótico
export interface PartnerBrand {
  logo: ImageMetadata;
  // onde tem desenho no PNG (medido pelo alfa)
  ink: InkBox;
  // altura do desenho no desktop, em rem. Não é igual pra todas de propósito: a logo de traço fino e larga
  // (Capim) pede mais área, e a sólida e quadrada (LAES) bem menos, pra as três pesarem o mesmo
  height: number;
  // legenda sob a logo; sem ela, vale o nome por extenso do partners.json (fullName)
  caption?: string;
}

export const PARTNER_BRANDS: Readonly<Record<string, PartnerBrand>> = {
  unicatolica: {
    logo: unicatolicaLogo,
    ink: { x: 8, y: 8, width: 1196, height: 1044 },
    height: 8.25,
    caption: `Cursos de ${courseNames()}`,
  },
  laes: {
    logo: laesLogo,
    ink: { x: 84, y: 73, width: 367, height: 382 },
    height: 5.6,
  },
  'capim-dourado': {
    logo: capimLogo,
    ink: { x: 8, y: 8, width: 1219, height: 612 },
    height: 7.25,
    caption: 'Parceiro exclusivo da premiação e palco da HackaRun Experience',
  },
};

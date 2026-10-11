import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

// paleta v2 (src/presentation/styles/tokens.css) adaptada pro papel branco
export const COLORS = {
  void: '#02030B',
  night: '#060B24',
  indigo: '#0B1242',
  electric: '#1264FF',
  cyan: '#00E5FF',
  violet: '#941BFF',
  magenta: '#ED28E8',
  orange: '#FF852F',
  gold: '#FFC24A',
  ice: '#F5F8FF',
  ink: '#141A33',
  muted: '#5A6380',
  line: '#D9DEEC',
  chip: '#EEF2FC',
  codeText: '#D6E4FF',
  coverText: '#B9C6EA',
} as const;

// degradê de energia do site (ciano → azul → violeta → magenta)
export const ENERGY_STOPS: readonly (readonly [number, string])[] = [
  [0, COLORS.cyan],
  [0.42, COLORS.electric],
  [0.76, COLORS.violet],
  [1, COLORS.magenta],
];

// ligaduras da JetBrains Mono ("://", "<->") saem deslocadas no pdfkit: texto mono vai sem elas.
// o fontkit aceita objeto liga/desliga; a tipagem do pdfkit só conhece a lista
export const MONO_FEATURES = { calt: false, liga: false } as unknown as PDFKit.Mixins.OpenTypeFeatures[];

export interface FontSet {
  display: string;
  body: string;
  bold: string;
  mono: string;
  // false = fontes padrão do PDF (Helvetica/Courier), que só cobrem WinAnsi
  brand: boolean;
}

const ASSETS = 'scripts/docs/assets';

// instâncias estáticas das fontes do site (build_pdf_assets.py)
const BRAND_FONTS = {
  display: 'orbitron-800.ttf',
  body: 'montserrat-400.ttf',
  bold: 'montserrat-700.ttf',
  mono: 'jetbrains-mono-500.ttf',
} as const;

export const BRAND_IMAGES = {
  logo: 'hackarun-logo.png',
  organizer: 'unicatolica-white.png',
  partner: 'capim-dourado-white.png',
} as const;

const FALLBACK: FontSet = {
  display: 'Helvetica-Bold',
  body: 'Helvetica',
  bold: 'Helvetica-Bold',
  mono: 'Courier',
  brand: false,
};

export function assetPath(root: string, file: string): string {
  return resolve(root, ASSETS, file);
}

// fontes da marca quando os TTFs existem; senão as padrão do PDF
export function registerFonts(doc: PDFKit.PDFDocument, root: string): FontSet {
  const entries = Object.entries(BRAND_FONTS);
  if (!entries.every(([, file]) => existsSync(assetPath(root, file)))) return FALLBACK;

  const names = { display: 'Display', body: 'Body', bold: 'Bold', mono: 'Mono' } as const;
  for (const [role, file] of entries)
    doc.registerFont(names[role as keyof typeof names], assetPath(root, file));
  return { ...names, brand: true };
}

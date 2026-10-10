import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

export const COLORS = {
  deep: '#07152C',
  abyss: '#040B18',
  navy: '#0B2450',
  cyan: '#00CFFF',
  royal: '#1E7BFF',
  amber: '#FFB547',
  white: '#FFFFFF',
  ink: '#0E1B33',
  muted: '#55627A',
  line: '#D5DEEA',
  chip: '#EEF4FB',
} as const;

export interface FontSet {
  display: string;
  body: string;
  bold: string;
  mono: string;
}

const STATIC_FONTS = {
  display: '@fontsource/big-shoulders-display/files/big-shoulders-display-latin-800-normal.woff2',
  body: '@fontsource/inter/files/inter-latin-400-normal.woff2',
  bold: '@fontsource/inter/files/inter-latin-700-normal.woff2',
  mono: '@fontsource/jetbrains-mono/files/jetbrains-mono-latin-500-normal.woff2',
};

// usa as fontes do site se estiverem instaladas (estáticas); senão cai nas padrão do PDF
export function registerFonts(doc: PDFKit.PDFDocument, root: string): FontSet {
  const path = (rel: string) => resolve(root, 'node_modules', rel);
  const available = Object.values(STATIC_FONTS).every((rel) => existsSync(path(rel)));
  if (!available)
    return { display: 'Helvetica-Bold', body: 'Helvetica', bold: 'Helvetica-Bold', mono: 'Courier' };

  doc.registerFont('Display', path(STATIC_FONTS.display));
  doc.registerFont('Body', path(STATIC_FONTS.body));
  doc.registerFont('Bold', path(STATIC_FONTS.bold));
  doc.registerFont('Mono', path(STATIC_FONTS.mono));
  return { display: 'Display', body: 'Body', bold: 'Bold', mono: 'Mono' };
}

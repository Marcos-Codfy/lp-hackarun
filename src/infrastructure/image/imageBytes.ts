// pedaços puros do codec de imagem (testáveis sem canvas)

// String.fromCharCode(...array gigante) estoura a pilha: converte em blocos
export function bytesToBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

export type Matte = 'light' | 'dark';

// fundos da paleta (ice e night do tokens.css)
export const MATTE_COLORS: Record<Matte, string> = { light: '#f5f8ff', dark: '#060b24' };

// logo com fundo transparente ganha um fundo que dá contraste: traço escuro vai pro claro e vice-versa.
// rgba = pixels de uma miniatura (getImageData); null = imagem opaca, nada a fazer
export function matteFor(rgba: ArrayLike<number>): Matte | null {
  const pixels = Math.floor(rgba.length / 4);
  let transparent = 0;
  let weight = 0;
  let luminance = 0;
  for (let i = 0; i < pixels * 4; i += 4) {
    const alpha = (rgba[i + 3] ?? 255) / 255;
    if (alpha < 0.98) transparent++;
    if (alpha <= 0.06) continue;
    const r = rgba[i] ?? 0;
    const g = rgba[i + 1] ?? 0;
    const b = rgba[i + 2] ?? 0;
    weight += alpha;
    luminance += (alpha * (0.2126 * r + 0.7152 * g + 0.0722 * b)) / 255;
  }
  if (pixels === 0 || transparent / pixels < 0.01) return null;
  if (weight === 0) return 'dark';
  return luminance / weight < 0.5 ? 'light' : 'dark';
}

const SIZE = 200;
const MIN_PIXELS = 300;
const FONT_STACK = '"Big Shoulders Variable", "Arial Black", Impact, sans-serif';

// pixels de um caractere desenhado num canvas 2D: preenchimento e contorno, já normalizados
export interface GlyphMask {
  // pares x,y em pixel
  fill: Uint16Array;
  edge: Uint16Array;
  centerX: number;
  centerY: number;
  height: number;
}

export function rasterizeGlyph(char: string): GlyphMask | null {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `900 ${Math.round(SIZE * 0.9)}px ${FONT_STACK}`;
    ctx.fillText(char, SIZE / 2, SIZE * 0.53);
    return collect(ctx.getImageData(0, 0, SIZE, SIZE).data);
  } catch {
    return null;
  }
}

function collect(data: Uint8ClampedArray): GlyphMask | null {
  const solid = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < SIZE && y < SIZE && (data[(y * SIZE + x) * 4 + 3] ?? 0) > 127;

  const fill: number[] = [];
  const edge: number[] = [];
  let minY = SIZE;
  let maxY = 0;
  let minX = SIZE;
  let maxX = 0;

  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (!solid(x, y)) continue;
      fill.push(x, y);
      if (!solid(x - 1, y) || !solid(x + 1, y) || !solid(x, y - 1) || !solid(x, y + 1)) edge.push(x, y);
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }

  if (fill.length / 2 < MIN_PIXELS || edge.length === 0) return null;
  return {
    fill: Uint16Array.from(fill),
    edge: Uint16Array.from(edge),
    centerX: (minX + maxX) / 2,
    centerY: (minY + maxY) / 2,
    height: maxY - minY + 1,
  };
}

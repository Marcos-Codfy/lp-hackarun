// desenho de uma mancha da aurora num <canvas> pequeno. O degradê é o mesmo do CSS (closest-side, cor cheia no
// centro, metade da opacidade em `mid`, transparente na borda), mas pintado uma vez por troca de cena: quem faz
// a transição entre as cores é a opacidade das camadas (compositor), e não uma interpolação de cor a cada quadro

// [r, g, b, alpha]: r/g/b de 0 a 255, alpha de 0 a 1
export type Rgba = readonly [number, number, number, number];

// "rgb(18 100 255 / 0.38)" ou "rgb(18, 100, 255)": as cores do sceneThemes.ts
const COLOR = /^rgba?\(\s*(\d{1,3})[\s,]+(\d{1,3})[\s,]+(\d{1,3})(?:\s*[/,]\s*(\d*\.?\d+%?))?\s*\)$/i;

export function parseAuroraColor(css: string): Rgba | null {
  const match = COLOR.exec(css.trim());
  if (!match) return null;
  const [r, g, b] = [match[1], match[2], match[3]].map((part) => Math.min(255, Number(part))) as [
    number,
    number,
    number,
  ];
  const raw = match[4];
  const alpha = raw === undefined ? 1 : raw.endsWith('%') ? Number.parseFloat(raw) / 100 : Number(raw);
  return [r, g, b, Math.min(1, Math.max(0, alpha))];
}

// o que o desenho precisa do contexto 2D (o teste passa um dublê)
export type BlobContext = Pick<
  CanvasRenderingContext2D,
  'clearRect' | 'save' | 'restore' | 'translate' | 'scale' | 'createRadialGradient' | 'fillRect' | 'fillStyle'
>;

const rgba = ([r, g, b, a]: Rgba, alpha = a): string => `rgba(${r}, ${g}, ${b}, ${alpha})`;

// o degradê vai de 0 a 1 num círculo unitário, que a escala estica até a elipse do canvas (como o closest-side
// de uma caixa que não é quadrada). A borda usa a MESMA cor com alpha 0: o CSS interpola pré-multiplicado, e
// um "transparent" preto deixaria a borda acinzentada
export function paintAuroraBlob(
  ctx: BlobContext,
  width: number,
  height: number,
  color: Rgba,
  mid: number,
): void {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.scale(width / 2, height / 2);
  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
  const addStop = (at: number, value: string) => gradient.addColorStop(at, value);
  addStop(0, rgba(color));
  addStop(mid, rgba(color, color[3] * 0.5));
  addStop(1, rgba(color, 0));
  ctx.fillStyle = gradient;
  ctx.fillRect(-1, -1, 2, 2);
  ctx.restore();
}

import { clamp } from '@shared/utils/math';
import type { StageFrame } from './BoltFactory';

// caixa do logo dentro do canvas, em px do canvas. Medidas de layout (offset*), não getBoundingClientRect:
// as animações de entrada não distorcem. Lê tudo antes de redimensionar o canvas (escrever no meio
// forçava outro layout)
export function measureStage(canvas: HTMLCanvasElement, logo: HTMLImageElement, maxDpr: number): StageFrame {
  const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const box = { w: canvas.offsetWidth, h: canvas.offsetHeight, x: canvas.offsetLeft, y: canvas.offsetTop };
  const img = { w: logo.offsetWidth, h: logo.offsetHeight, x: logo.offsetLeft, y: logo.offsetTop };
  canvas.width = Math.max(1, Math.round(box.w * dpr));
  canvas.height = Math.max(1, Math.round(box.h * dpr));
  return {
    ox: (img.x - box.x) * dpr,
    oy: (img.y - box.y) * dpr,
    w: img.w * dpr,
    h: img.h * dpr,
    width: canvas.width,
    height: canvas.height,
    scale: dpr * clamp(img.w / 760, 0.8, 1.35),
  };
}

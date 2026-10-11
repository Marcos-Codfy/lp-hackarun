import type { ContourReply, ContourRequest } from './ContourMessages';
import { LogoContour } from './LogoContour';
import type { ContourPoint } from './types';

// silhueta do logo pros raios: no worker (no boot o drawImage da thread principal travava esperando a GPU,
// 100-400 ms); sem worker/OffscreenCanvas, ou se ele falhar, o mesmo cálculo roda aqui
export class ContourSource {
  static async sample(img: HTMLImageElement, width = 300): Promise<ContourPoint[]> {
    const height = Math.max(1, Math.round((width * img.naturalHeight) / (img.naturalWidth || 1)));
    const src = img.currentSrc || img.src;
    try {
      return LogoContour.unflatten(await ContourSource.inWorker({ src, width, height }));
    } catch {
      return ContourSource.onMainThread(img, width, height);
    }
  }

  private static inWorker(request: ContourRequest): Promise<Float32Array> {
    return new Promise((resolve, reject) => {
      if (!request.src || typeof Worker === 'undefined' || typeof OffscreenCanvas === 'undefined') {
        reject(new Error('no-worker'));
        return;
      }
      // o Vite empacota o worker como chunk próprio a partir desse new URL(...)
      const worker = new Worker(new URL('./contour.worker.ts', import.meta.url), { type: 'module' });
      const settle = (reply: ContourReply | Error): void => {
        worker.terminate();
        if (reply instanceof Error) reject(reply);
        else if ('error' in reply) reject(new Error(reply.error));
        else resolve(reply.points);
      };
      worker.onmessage = (event: MessageEvent<ContourReply>) => settle(event.data);
      worker.onmessageerror = () => settle(new Error('contour worker message error'));
      worker.onerror = (event) => {
        event.preventDefault();
        settle(new Error(event.message || 'contour worker failed'));
      };
      worker.postMessage(request);
    });
  }

  private static onMainThread(img: HTMLImageElement, width: number, height: number): ContourPoint[] {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, width, height);
    return LogoContour.fromRgba(ctx.getImageData(0, 0, width, height).data, width, height);
  }
}

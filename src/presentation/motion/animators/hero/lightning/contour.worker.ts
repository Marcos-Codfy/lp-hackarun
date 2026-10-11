import type { ContourReply, ContourRequest } from './ContourMessages';
import { LogoContour } from './LogoContour';

// só o necessário do escopo do worker (o tsconfig do projeto usa a lib DOM)
interface WorkerScope {
  onmessage: ((event: MessageEvent<ContourRequest>) => void) | null;
  postMessage(message: ContourReply, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

async function contourOf({ src, width, height }: ContourRequest): Promise<Float32Array> {
  // force-cache: a <img> acabou de baixar o arquivo, não precisa revalidar
  const blob = await fetch(src, { cache: 'force-cache' }).then((response) => response.blob());
  const bitmap = await createImageBitmap(blob, {
    resizeWidth: width,
    resizeHeight: height,
    resizeQuality: 'medium',
  });
  const ctx = new OffscreenCanvas(width, height).getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('no 2d context');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();
  const points = LogoContour.fromRgba(ctx.getImageData(0, 0, width, height).data, width, height);
  return LogoContour.flatten(points);
}

// decodifica, reduz e acha a silhueta do logo fora da thread principal (lá o drawImage esperava a GPU)
scope.onmessage = ({ data }) => {
  contourOf(data)
    .then((points) => scope.postMessage({ points }, [points.buffer]))
    .catch((error: unknown) => scope.postMessage({ error: String(error) }, []));
};

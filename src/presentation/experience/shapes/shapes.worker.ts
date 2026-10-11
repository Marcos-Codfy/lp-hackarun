import { transferablesOf } from '../particles/ParticleBuffers';
import { particleJob, runToEnd } from './ParticleJob';
import type { ShapeReply, ShapeRequest } from './ShapeMessages';

// só o necessário do escopo do worker (o tsconfig do projeto usa a lib DOM)
interface WorkerScope {
  onmessage: ((event: MessageEvent<ShapeRequest>) => void) | null;
  postMessage(message: ShapeReply, transfer: Transferable[]): void;
}

const scope = self as unknown as WorkerScope;

// gera todas as formas + sementes fora da thread principal (sem three.js aqui) e devolve por transferência
scope.onmessage = ({ data }) => {
  try {
    const buffers = runToEnd(particleJob(data.keys, data.count));
    scope.postMessage({ buffers }, transferablesOf(buffers));
  } catch (error) {
    scope.postMessage({ error: String(error) }, []);
  }
};

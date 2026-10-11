import type { SceneKey } from '@presentation/app/AppEvents';
import type { ParticleBuffers } from '../particles/ParticleBuffers';
import { yieldToMain } from '../yieldToMain';
import type { ShapeReply, ShapeRequest } from './ShapeMessages';

// um pedido em andamento: abortar encerra o worker ou para o fallback no próximo passo
interface Run {
  aborted: boolean;
  stop: () => void;
}

// formas + sementes das partículas: no worker (thread principal livre); sem worker ou se ele falhar,
// o mesmo cálculo roda aqui em fatias. O resultado é idêntico nos dois caminhos (mesmo código, mesmas sementes)
export class ShapeSource {
  private readonly runs = new Set<Run>();

  request(keys: readonly SceneKey[], count: number): Promise<ParticleBuffers> {
    const run: Run = { aborted: false, stop: () => {} };
    this.runs.add(run);
    const buffers = this.inWorker({ keys: [...keys], count }, run)
      .catch((error: unknown) => {
        if (run.aborted) throw error;
        console.warn('[experience] shape worker unavailable, generating on main thread', error);
        return this.onMainThread(keys, count, run);
      })
      .finally(() => this.runs.delete(run));
    // quem pede trata o erro quando for esperar; aqui só evita o aviso de rejeição não tratada até lá
    buffers.catch(() => undefined);
    return buffers;
  }

  // palpite de tier errado ou palco que não montou: nada fica calculando à toa
  cancel(): void {
    this.runs.forEach((run) => {
      run.aborted = true;
      run.stop();
    });
    this.runs.clear();
  }

  private inWorker(request: ShapeRequest, run: Run): Promise<ParticleBuffers> {
    return new Promise((resolve, reject) => {
      if (typeof Worker === 'undefined') {
        reject(new Error('no-worker'));
        return;
      }
      // o Vite empacota o worker como chunk próprio a partir desse new URL(...)
      const worker = new Worker(new URL('./shapes.worker.ts', import.meta.url), { type: 'module' });
      const settle = (reply: ShapeReply | Error): void => {
        run.stop = () => {};
        worker.terminate();
        if (reply instanceof Error) reject(reply);
        else if ('error' in reply) reject(new Error(reply.error));
        else resolve(reply.buffers);
      };
      run.stop = () => settle(new Error('shape request cancelled'));
      worker.onmessage = (event: MessageEvent<ShapeReply>) => settle(event.data);
      worker.onmessageerror = () => settle(new Error('shape worker message error'));
      worker.onerror = (event) => {
        event.preventDefault();
        settle(new Error(event.message || 'shape worker failed'));
      };
      worker.postMessage(request);
    });
  }

  // chunk à parte: as estratégias só vêm pra thread principal quando o worker não deu
  private async onMainThread(keys: readonly SceneKey[], count: number, run: Run): Promise<ParticleBuffers> {
    const { particleJob } = await import('./ParticleJob');
    const job = particleJob(keys, count);
    for (;;) {
      if (run.aborted) throw new Error('shape request cancelled');
      const step = job.next();
      if (step.done) return step.value;
      await yieldToMain();
    }
  }
}

// formas das partículas: o job (worker ou fallback) tem que sair igualzinho ao cálculo direto
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SceneKey } from '@presentation/app/AppEvents';
import { transferablesOf } from '@presentation/experience/particles/ParticleBuffers';
import { particleSeeds } from '@presentation/experience/particles/particleSeeds';
import { particleJob, runToEnd } from '@presentation/experience/shapes/ParticleJob';
import { ShapeFactory } from '@presentation/experience/shapes/ShapeFactory';
import type { ShapeReply, ShapeRequest } from '@presentation/experience/shapes/ShapeMessages';
import { ShapeSource } from '@presentation/experience/shapes/ShapeSource';

const KEYS: readonly SceneKey[] = ['core', 'orbit', 'enigma', 'map', 'terrain', 'stage', 'trophy', 'dust'];
const COUNT = 1500;

// Worker de mentira: responde na próxima tarefa com o mesmo job que o shapes.worker roda
class FakeWorker {
  static created: FakeWorker[] = [];
  onmessage: ((event: { data: ShapeReply }) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  onerror: ((event: { preventDefault(): void; message: string }) => void) | null = null;
  terminated = false;

  constructor() {
    FakeWorker.created.push(this);
  }

  postMessage(request: ShapeRequest): void {
    setTimeout(() => {
      if (this.terminated) return;
      this.onmessage?.({ data: { buffers: runToEnd(particleJob(request.keys, request.count)) } });
    }, 0);
  }

  terminate(): void {
    this.terminated = true;
  }
}

afterEach(() => {
  vi.unstubAllGlobals();
  FakeWorker.created = [];
});

describe('particleJob', () => {
  it('gera o mesmo que o ShapeFactory direto e as mesmas sementes', () => {
    const buffers = runToEnd(particleJob(KEYS, COUNT));
    const factory = ShapeFactory.createDefault();
    KEYS.forEach((key, i) => expect(buffers.targets[i]).toEqual(factory.build(key, COUNT)));
    const { seeds, scales } = particleSeeds(COUNT);
    expect(buffers.seeds).toEqual(seeds);
    expect(buffers.scales).toEqual(scales);
  });

  it('é determinístico e transfere todos os buffers', () => {
    const a = runToEnd(particleJob(KEYS, COUNT));
    expect(runToEnd(particleJob(KEYS, COUNT))).toEqual(a);
    expect(transferablesOf(a)).toHaveLength(KEYS.length + 2);
  });
});

describe('ShapeSource', () => {
  it('sem Worker, calcula na thread principal com o mesmo resultado', async () => {
    vi.stubGlobal('Worker', undefined);
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const buffers = await new ShapeSource().request(KEYS, COUNT);
    expect(buffers).toEqual(runToEnd(particleJob(KEYS, COUNT)));
  });

  it('usa o worker e encerra ele depois da resposta', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const buffers = await new ShapeSource().request(['core', 'map'], COUNT);
    expect(buffers).toEqual(runToEnd(particleJob(['core', 'map'], COUNT)));
    expect(FakeWorker.created).toHaveLength(1);
    expect(FakeWorker.created[0]?.terminated).toBe(true);
  });

  it('cancel derruba o pedido em andamento', async () => {
    vi.stubGlobal('Worker', FakeWorker);
    const source = new ShapeSource();
    const pending = source.request(['core'], COUNT);
    source.cancel();
    await expect(pending).rejects.toThrow('cancelled');
    expect(FakeWorker.created[0]?.terminated).toBe(true);
  });
});

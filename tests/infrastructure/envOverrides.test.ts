// @vitest-environment node
// variáveis do build por cima do event.json: o endpoint do ambiente ganha do JSON, e a flag de simulação nunca
// chega no site oficial sem planilha (o build da main quebra em vez de publicar um formulário que não grava)
import { afterEach, describe, expect, it, vi } from 'vitest';
import eventData from '@infrastructure/content/event.json';
import type { RawEvent } from '@infrastructure/content/schema';

const ENDPOINT = 'https://script.google.com/macros/s/teste/exec';
const raw = eventData as RawEvent;

interface BuildEnv {
  endpoint?: string;
  flag?: string;
  branch?: string;
}

// a flag é lida na carga do módulo e o vitest roda como dev: o build de verdade tem DEV=false
async function overridesWith(env: BuildEnv) {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.stubEnv('DEV', false);
  vi.stubEnv('PUBLIC_REGISTRATION_ENDPOINT', env.endpoint ?? '');
  if (env.flag !== undefined) vi.stubEnv('PUBLIC_REGISTRATION_SIMULATED', env.flag);
  if (env.branch !== undefined) {
    vi.stubEnv('CF_PAGES', '1');
    vi.stubEnv('CF_PAGES_BRANCH', env.branch);
  }
  const { withEnvOverrides } = await import('@infrastructure/config/env');
  return () => withEnvOverrides(raw);
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('withEnvOverrides', () => {
  it('o PUBLIC_REGISTRATION_ENDPOINT entra no lugar do endpoint do JSON', async () => {
    const run = await overridesWith({ endpoint: ENDPOINT });
    expect(run().registration.endpoint).toBe(ENDPOINT);
  });

  it('sem variável fica o JSON (vazio = inscrições em breve)', async () => {
    const run = await overridesWith({});
    expect(run().registration.endpoint).toBe(raw.registration.endpoint);
  });

  it('quebra o build da main com a flag ligada e sem endpoint', async () => {
    const run = await overridesWith({ flag: 'true', branch: 'main' });
    expect(run).toThrow(/PUBLIC_REGISTRATION_SIMULATED=true no build de produção/);
  });

  it('na main com endpoint a planilha ganha e a flag é só ignorada', async () => {
    const run = await overridesWith({ flag: 'true', branch: 'main', endpoint: ENDPOINT });
    expect(run().registration.endpoint).toBe(ENDPOINT);
  });

  it('a prévia de um PR simula à vontade, e a main sem a flag segue em breve', async () => {
    expect(await overridesWith({ flag: 'true', branch: 'feat/novo-texto' })).not.toThrow();
    expect(await overridesWith({ branch: 'main' })).not.toThrow();
  });
});

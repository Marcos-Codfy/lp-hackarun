// modo da inscrição no build: o endpoint sempre ganha; sem ele, a flag PUBLIC_REGISTRATION_SIMULATED (ou o dev)
// liga a simulação, e sem nada fica "em breve"
import { afterEach, describe, expect, it, vi } from 'vitest';
import { registrationMode } from '@shared/config/registrationMode';

const ENDPOINT = 'https://script.google.com/macros/s/teste/exec';

// as constantes são lidas na carga do módulo: troca o ambiente e importa de novo
async function loadWith(env: { flag?: string; dev: boolean }) {
  vi.unstubAllEnvs();
  vi.resetModules();
  vi.stubEnv('DEV', env.dev);
  if (env.flag !== undefined) vi.stubEnv('PUBLIC_REGISTRATION_SIMULATED', env.flag);
  return import('@shared/config/registrationMode');
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('registrationMode', () => {
  it('com endpoint é sempre a planilha de verdade, com ou sem a flag', () => {
    expect(registrationMode(ENDPOINT, true)).toBe('live');
    expect(registrationMode(ENDPOINT, false)).toBe('live');
  });

  it('sem endpoint: simulação liberada simula, desligada fica em breve', () => {
    expect(registrationMode(null, true)).toBe('simulated');
    expect(registrationMode(null, false)).toBe('off');
  });
});

describe('flag PUBLIC_REGISTRATION_SIMULATED no build', () => {
  it('"true" liga a simulação no build de produção (prévia da Cloudflare)', async () => {
    const mod = await loadWith({ flag: 'true', dev: false });
    expect(mod.SIMULATION_FLAG).toBe(true);
    expect(mod.SIMULATION_ENABLED).toBe(true);
    expect(mod.registrationMode(null)).toBe('simulated');
    expect(mod.registrationMode(ENDPOINT)).toBe('live');
  });

  it('ausente, vazia ou qualquer outro valor deixa a produção sem simulação', async () => {
    for (const flag of [undefined, '', 'false', 'TRUE', '1', ' true']) {
      const mod = await loadWith({ dev: false, ...(flag !== undefined && { flag }) });
      expect(mod.SIMULATION_FLAG, String(flag)).toBe(false);
      expect(mod.SIMULATION_ENABLED, String(flag)).toBe(false);
      expect(mod.registrationMode(null), String(flag)).toBe('off');
    }
  });

  it('no npm run dev a simulação já vem liberada, sem a flag', async () => {
    const mod = await loadWith({ dev: true });
    expect(mod.SIMULATION_FLAG).toBe(false);
    expect(mod.SIMULATION_ENABLED).toBe(true);
  });
});

// @vitest-environment node
// onde o build roda (Cloudflare Pages: CF_PAGES e CF_PAGES_BRANCH): produção indexável, prévia com noindex e a
// trava que impede a inscrição simulada no site oficial
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  assertNoSimulationInProduction,
  DEFAULT_SITE_URL,
  isIndexable,
  isPreviewBuild,
  isProductionBuild,
} from '@shared/config/deploy';

const MAIN = { cfPages: '1', branch: 'main' };
const PR = { cfPages: '1', branch: 'feat/hero-copy' };
const LOCAL = {};

describe('alvo do build', () => {
  it('produção = Cloudflare na main; prévia = Cloudflare em outra branch; local não é nenhum dos dois', () => {
    expect(isProductionBuild(MAIN)).toBe(true);
    expect(isPreviewBuild(MAIN)).toBe(false);
    expect(isProductionBuild(PR)).toBe(false);
    expect(isPreviewBuild(PR)).toBe(true);
    expect(isProductionBuild(LOCAL)).toBe(false);
    expect(isPreviewBuild(LOCAL)).toBe(false);
    // branch sem a marca da Cloudflare não conta (CI do GitHub, por exemplo)
    expect(isPreviewBuild({ branch: 'feat/x' })).toBe(false);
  });
});

describe('isIndexable', () => {
  it('produção é sempre indexável, mesmo com a flag vazada (a trava do build cuida dela)', () => {
    expect(isIndexable({ ...MAIN, simulationFlag: false })).toBe(true);
    expect(isIndexable({ ...MAIN, simulationFlag: true })).toBe(true);
  });

  it('prévia de PR e build com a inscrição simulada ficam fora dos buscadores', () => {
    expect(isIndexable({ ...PR, simulationFlag: false })).toBe(false);
    expect(isIndexable({ ...PR, simulationFlag: true })).toBe(false);
    expect(isIndexable({ ...LOCAL, simulationFlag: true })).toBe(false);
  });

  it('build local ou da CI sem a flag continua indexável (é o que vai pra produção)', () => {
    expect(isIndexable({ ...LOCAL, simulationFlag: false })).toBe(true);
  });
});

describe('assertNoSimulationInProduction', () => {
  it('quebra o build da main que ia simular as inscrições, com o recado do que fazer', () => {
    expect(() => assertNoSimulationInProduction(true, MAIN)).toThrow(/ambiente Production/);
  });

  it('deixa passar a prévia simulada, a produção de verdade e o build local', () => {
    expect(() => assertNoSimulationInProduction(true, PR)).not.toThrow();
    expect(() => assertNoSimulationInProduction(false, MAIN)).not.toThrow();
    expect(() => assertNoSimulationInProduction(true, LOCAL)).not.toThrow();
  });
});

describe('endereço oficial', () => {
  it('é https://hackarun.pages.dev, igual ao padrão do astro.config.mjs (o PUBLIC_SITE_URL troca)', () => {
    const config = readFileSync(fileURLToPath(new URL('../../astro.config.mjs', import.meta.url)), 'utf8');
    expect(DEFAULT_SITE_URL).toBe('https://hackarun.pages.dev');
    expect(config).toContain(`process.env.PUBLIC_SITE_URL || '${DEFAULT_SITE_URL}'`);
  });
});

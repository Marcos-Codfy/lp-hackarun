// onde o build roda. A Cloudflare Pages expõe CF_PAGES=1 e CF_PAGES_BRANCH durante o build; fora dela os dois
// faltam (build local, CI do GitHub)
export const PRODUCTION_BRANCH = 'main';

// endereço oficial; o PUBLIC_SITE_URL troca (fork, domínio próprio). Igual ao do astro.config.mjs (um teste confere)
export const DEFAULT_SITE_URL = 'https://hackarun.pages.dev';

export interface BuildTarget {
  cfPages?: string | undefined;
  branch?: string | undefined;
}

// build da Cloudflare na branch de produção: o site oficial
export function isProductionBuild({ cfPages, branch }: BuildTarget): boolean {
  return cfPages === '1' && branch === PRODUCTION_BRANCH;
}

// build da Cloudflare em outra branch: a prévia de um PR
export function isPreviewBuild({ cfPages, branch }: BuildTarget): boolean {
  return cfPages === '1' && Boolean(branch) && branch !== PRODUCTION_BRANCH;
}

// prévia fica fora dos buscadores (a Cloudflare já manda X-Robots-Tag: noindex nelas; o meta é a segunda trava).
// Build com a inscrição simulada fora da produção também conta como prévia. Produção é sempre indexável
export function isIndexable(target: BuildTarget & { simulationFlag: boolean }): boolean {
  if (isProductionBuild(target)) return true;
  return !isPreviewBuild(target) && !target.simulationFlag;
}

// a flag de simulação foi parar no ambiente Production sem endpoint: quebra o build (a Cloudflare mantém o deploy
// anterior no ar) em vez de publicar um formulário que não grava nada
export function assertNoSimulationInProduction(simulated: boolean, target: BuildTarget): void {
  if (!simulated || !isProductionBuild(target)) return;
  throw new Error(
    'PUBLIC_REGISTRATION_SIMULATED=true no build de produção (branch main) sem PUBLIC_REGISTRATION_ENDPOINT: ' +
      'as inscrições seriam simuladas no site oficial. Tire a variável do ambiente Production na Cloudflare ' +
      '(ela é só do Preview).',
  );
}

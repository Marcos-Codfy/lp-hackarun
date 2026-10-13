// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// endereço oficial (Cloudflare Pages, projeto "hackarun"); o PUBLIC_SITE_URL troca (fork, domínio próprio). Vazio
// conta como não definido. Igual ao DEFAULT_SITE_URL de src/shared/config/deploy.ts (um teste confere)
const site = process.env.PUBLIC_SITE_URL || 'https://hackarun.pages.dev';

export default defineConfig({
  site,
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  // endereços sem barra no fim (/inscricao, /equipes): o build gera inscricao.html, que o Cloudflare Pages
  // serve em /inscricao direto (pasta/index.html custaria um redirect 308 pra /inscricao/ a cada clique) e o
  // sitemap fica igual ao canonical
  trailingSlash: 'never',
  build: {
    format: 'file',
    // css pequeno vai inline, evita request bloqueante no primeiro paint
    inlineStylesheets: 'auto',
  },
  vite: {
    build: {
      target: 'es2022',
      // three fica num chunk separado, carregado só depois do primeiro paint
      chunkSizeWarningLimit: 700,
    },
  },
});

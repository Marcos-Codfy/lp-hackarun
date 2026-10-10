// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.PUBLIC_SITE_URL ?? 'https://lp-hackarun.pages.dev';

export default defineConfig({
  site,
  integrations: [sitemap()],
  devToolbar: { enabled: false },
  build: {
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

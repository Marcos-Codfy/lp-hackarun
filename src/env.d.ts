/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_SITE_URL?: string;
  readonly PUBLIC_REGISTRATION_ENDPOINT?: string;
  // "true" só nas prévias da Cloudflare: sem endpoint, a inscrição roda simulada
  readonly PUBLIC_REGISTRATION_SIMULATED?: string;
  // só no build (código do servidor), vindas da Cloudflare Pages
  readonly CF_PAGES?: string;
  readonly CF_PAGES_BRANCH?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

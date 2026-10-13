import type { APIRoute } from 'astro';
import { DEFAULT_SITE_URL } from '@shared/config/deploy';

// robots.txt gerado no build, com o sitemap do endereço do site (PUBLIC_SITE_URL ou o oficial). A prévia continua
// liberada pro rastreio: quem tira ela dos buscadores é o noindex de cada página (e o X-Robots-Tag da Cloudflare)
export const GET: APIRoute = ({ site }) => {
  const sitemap = new URL('/sitemap-index.xml', site ?? DEFAULT_SITE_URL).href;
  return new Response(`User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};

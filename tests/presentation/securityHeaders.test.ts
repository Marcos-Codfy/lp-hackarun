// CSP do site: só 'self' para scripts, com a única exceção do Web Analytics da Cloudflare (script e medição)
// @vitest-environment node
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const csp = (
  readFileSync(`${ROOT}public/_headers`, 'utf8').match(/Content-Security-Policy: (.+)/)?.[1] ?? ''
).trim();
const directive = (name: string) =>
  csp
    .split(';')
    .map((d) => d.trim())
    .find((d) => d.startsWith(`${name} `)) ?? '';

describe('Content-Security-Policy', () => {
  it('scripts: o próprio site e o script do Web Analytics da Cloudflare, nunca inline nem eval', () => {
    expect(directive('script-src').split(' ').slice(1).sort()).toEqual([
      "'self'",
      'https://static.cloudflareinsights.com',
    ]);
    expect(csp).not.toMatch(/unsafe-eval|script-src[^;]*unsafe-inline/);
  });

  it('a medição do Web Analytics sai para cloudflareinsights.com e o envio das inscrições segue liberado', () => {
    const connect = directive('connect-src');
    expect(connect).toContain('https://cloudflareinsights.com');
    expect(connect).toContain('https://script.google.com');
    expect(connect).toContain('https://script.googleusercontent.com');
  });

  it('o resto continua fechado (sem frame, objeto nem base externa)', () => {
    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
  });
});

describe('aviso de privacidade e a medição de visitas', () => {
  it('não promete mais "sem analytics" (a Cloudflare conta as visitas, sem cookies)', () => {
    const notice = readFileSync(`${ROOT}src/presentation/components/privacy/PrivacyNotice.astro`, 'utf8');
    expect(notice).not.toMatch(/analytics/i);
    expect(notice).toContain('Sem cookies de rastreamento.');
  });
});

import type { RawEvent } from '../content/schema';

// variáveis PUBLIC_* do .env / painel da Cloudflare ganham do JSON (útil pra planilha de teste vs produção)
export function withEnvOverrides(raw: RawEvent): RawEvent {
  const endpoint = import.meta.env.PUBLIC_REGISTRATION_ENDPOINT as string | undefined;
  if (!endpoint) return raw;
  return { ...raw, registration: { ...raw.registration, endpoint } };
}

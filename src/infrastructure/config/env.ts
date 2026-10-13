import { assertNoSimulationInProduction } from '@shared/config/deploy';
import { registrationMode } from '@shared/config/registrationMode';
import type { RawEvent } from '../content/schema';

// variáveis PUBLIC_* do .env / painel da Cloudflare ganham do JSON (útil pra planilha de teste vs produção)
export function withEnvOverrides(raw: RawEvent): RawEvent {
  const endpoint = import.meta.env.PUBLIC_REGISTRATION_ENDPOINT as string | undefined;
  const event = endpoint ? { ...raw, registration: { ...raw.registration, endpoint } } : raw;
  // roda no build: a flag de simulação nunca chega no site oficial sem planilha
  const mode = registrationMode(event.registration.endpoint?.trim() || null);
  assertNoSimulationInProduction(mode === 'simulated', {
    cfPages: import.meta.env.CF_PAGES,
    branch: import.meta.env.CF_PAGES_BRANCH,
  });
  return event;
}

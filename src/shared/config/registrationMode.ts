// como a inscrição funciona neste build: planilha de verdade (live), simulada (nada é gravado) ou em breve (off)
export type RegistrationMode = 'live' | 'simulated' | 'off';

// PUBLIC_REGISTRATION_SIMULATED=true só nas prévias da Cloudflare; só a string "true" liga
export const SIMULATION_FLAG: boolean = import.meta.env.PUBLIC_REGISTRATION_SIMULATED === 'true';

// simulação liberada neste build: `npm run dev` ou a flag. O Vite troca o import.meta.env por literais no build;
// desligada, a constante vira `false` e o store, o repositório e o gateway simulados nem entram no bundle
export const SIMULATION_ENABLED: boolean = import.meta.env.DEV || SIMULATION_FLAG;

// o endpoint configurado sempre ganha: com planilha de verdade a flag é ignorada
export function registrationMode(
  endpoint: string | null,
  simulation: boolean = SIMULATION_ENABLED,
): RegistrationMode {
  if (endpoint) return 'live';
  return simulation ? 'simulated' : 'off';
}

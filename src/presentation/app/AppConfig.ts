import type { MilestoneDTO, RegistrationDTO } from '@application/index';

// dados que o build injeta na página (script#app-config) pro código do browser
export interface AppConfig {
  milestones: MilestoneDTO[];
  registration: RegistrationDTO;
  // mesmo Web App do Apps Script, rota GET ?action=teams
  teamsEndpoint: string | null;
  audioCueUrl: string | null;
}

export const APP_CONFIG_ID = 'app-config';

export function readAppConfig(): AppConfig | null {
  const el = document.getElementById(APP_CONFIG_ID);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent) as AppConfig;
  } catch {
    return null;
  }
}

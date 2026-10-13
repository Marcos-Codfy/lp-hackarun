import type { RegistrationDTO } from '@application/index';
import { registrationMode, SIMULATION_ENABLED } from '@shared/config/registrationMode';

export interface FormStatus {
  status: RegistrationDTO['status'];
  // dev ou prévia sem planilha: o formulário abre com o gateway em memória (nada é gravado) e mostra o aviso
  simulated: boolean;
  // aceita envio agora (aberta ou nas últimas horas)
  isOpen: boolean;
}

// o status que a página de inscrição mostra (o formulário, o selo e o indicador de etapas usam o mesmo).
// Só simula o que estaria "em breve": com endpoint a planilha ganha, e prazo vencido ou vagas esgotadas fecham
export function formStatus(
  registration: RegistrationDTO,
  simulation: boolean = SIMULATION_ENABLED,
): FormStatus {
  const simulated =
    registration.status === 'soon' && registrationMode(registration.endpoint, simulation) === 'simulated';
  const status = simulated ? 'open' : registration.status;
  return { status, simulated, isOpen: status === 'open' || status === 'closing' };
}

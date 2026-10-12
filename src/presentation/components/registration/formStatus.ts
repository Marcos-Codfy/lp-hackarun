import type { RegistrationDTO } from '@application/index';

export interface FormStatus {
  status: RegistrationDTO['status'];
  // dev sem planilha: o formulário abre com o gateway em memória pra testar a UX
  simulated: boolean;
  // aceita envio agora (aberta ou nas últimas horas)
  isOpen: boolean;
}

// o status que a página de inscrição mostra (o formulário, o selo e o indicador de etapas usam o mesmo)
export function formStatus(registration: RegistrationDTO, dev: boolean = import.meta.env.DEV): FormStatus {
  const simulated = dev && registration.status === 'soon' && !registration.endpoint;
  const status = simulated ? 'open' : registration.status;
  return { status, simulated, isOpen: status === 'open' || status === 'closing' };
}

import { registrationMode, SIMULATION_ENABLED } from '@shared/config/registrationMode';

export interface MentorFormStatus {
  status: 'open' | 'soon';
  // dev ou prévia sem planilha: o formulário abre com o gateway em memória (nada é gravado) e mostra o aviso
  simulated: boolean;
  isOpen: boolean;
}

// o cadastro de mentor não tem prazo nem vagas: abre quando há planilha (ou simulação na prévia) e o servidor
// o fecha quando a organização decidir (MENTORES_FECHADOS)
export function mentorFormStatus(
  endpoint: string | null,
  simulation: boolean = SIMULATION_ENABLED,
): MentorFormStatus {
  const mode = registrationMode(endpoint, simulation);
  return {
    status: mode === 'off' ? 'soon' : 'open',
    simulated: mode === 'simulated',
    isOpen: mode !== 'off',
  };
}

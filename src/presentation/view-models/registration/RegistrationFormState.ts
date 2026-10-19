import type { RegistrationErrors } from '@domain/index';
import { FIELD_ORDER, type RegistrationFields } from './RegistrationFields';
import { NO_STEP_DONE, type StepCompletion } from './registrationSteps';

export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export interface FieldError {
  path: string;
  message: string;
}

export interface FocusRequest {
  path: string;
  // seq muda a cada pedido: a View foca de novo mesmo se o campo for o mesmo
  seq: number;
  // "invalid" = veio de um envio com erro (a View anuncia quantos campos faltam)
  reason: 'invalid' | 'move';
}

export interface RegistrationFormState {
  fields: RegistrationFields;
  // só os erros que o usuário já deveria ver (campo tocado ou envio tentado)
  errors: RegistrationErrors;
  orderedErrors: FieldError[];
  status: FormStatus;
  // já tentou enviar: a View passa a mostrar o resumo de erros
  attempted: boolean;
  protocol: string | null;
  // a inscrição que entrou é de menor de idade: o sucesso lembra da autorização do responsável
  needsGuardianConsent: boolean;
  failure: string | null;
  // a falha passa com o mesmo envio (rede, servidor): a View mostra o "Tentar de novo"
  retryable: boolean;
  // aceita envio agora; começa com o status do build e o navegador só pode fechar
  open: boolean;
  focus: FocusRequest | null;
  // etapas sem nenhum erro de validação (indicador de progresso), tocadas ou não
  steps: StepCompletion;
}

// erros na ordem visual do formulário (o primeiro é quem ganha o foco)
export function orderErrors(errors: RegistrationErrors): FieldError[] {
  const rank = (path: string) =>
    FIELD_ORDER.includes(path) ? FIELD_ORDER.indexOf(path) : FIELD_ORDER.length;
  return Object.entries(errors)
    .map(([path, message]) => ({ path, message }))
    .sort((a, b) => rank(a.path) - rank(b.path));
}

// envio saindo: limpa a falha e os erros da tentativa anterior (o resumo volta só se a resposta trouxer erro)
export const submittingState = (s: RegistrationFormState): RegistrationFormState => ({
  ...s,
  status: 'submitting',
  attempted: true,
  failure: null,
  retryable: false,
  errors: {},
  orderedErrors: [],
});

// formulário recém-montado: vazio, sem erro à vista e com o status do build
export function initialState(fields: RegistrationFields, open: boolean): RegistrationFormState {
  return {
    fields,
    errors: {},
    orderedErrors: [],
    status: 'idle',
    attempted: false,
    protocol: null,
    needsGuardianConsent: false,
    failure: null,
    retryable: false,
    open,
    focus: null,
    steps: NO_STEP_DONE,
  };
}

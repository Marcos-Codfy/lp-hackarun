import type { RegistrationErrors } from '@domain/index';
import { fieldOrder, type RegistrationFields } from './RegistrationFields';

export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

// foto/logo: nada escolhido, preparando no aparelho, pronta pro envio ou recusada (o erro diz o porquê)
export type TeamImageStatus = 'empty' | 'processing' | 'ready' | 'invalid';

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
  failure: string | null;
  // a falha passa com o mesmo envio (rede, servidor): a View mostra o "Tentar de novo"
  retryable: boolean;
  // aceita envio agora; começa com o status do build e o navegador só pode fechar
  open: boolean;
  focus: FocusRequest | null;
  canAddMember: boolean;
  // tem integrante além do mínimo: as linhas 2 em diante ganham o "Remover" (o contato nunca sai)
  canRemoveMember: boolean;
  imageStatus: TeamImageStatus;
  // aviso pro leitor de tela ao somar ou tirar integrante; seq muda a cada aviso
  announcement: Announcement | null;
}

export interface Announcement {
  text: string;
  seq: number;
}

// erros na ordem visual do formulário (o primeiro é quem ganha o foco)
export function orderErrors(errors: RegistrationErrors, fields: RegistrationFields): FieldError[] {
  const order = fieldOrder(fields);
  const rank = (path: string) => (order.includes(path) ? order.indexOf(path) : order.length);
  return Object.entries(errors)
    .map(([path, message]) => ({ path, message }))
    .sort((a, b) => rank(a.path) - rank(b.path));
}

// formulário recém-montado: vazio, sem erro à vista e com o status do build
export function initialState(
  fields: RegistrationFields,
  open: boolean,
  bounds: Pick<RegistrationFormState, 'canAddMember' | 'canRemoveMember'>,
): RegistrationFormState {
  return {
    fields,
    errors: {},
    orderedErrors: [],
    status: 'idle',
    attempted: false,
    protocol: null,
    failure: null,
    retryable: false,
    open,
    focus: null,
    imageStatus: 'empty',
    announcement: null,
    ...bounds,
  };
}

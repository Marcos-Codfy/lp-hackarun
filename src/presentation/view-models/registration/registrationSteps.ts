import type { RegistrationErrors } from '@domain/index';
import type { RegistrationFields } from './RegistrationFields';

// as 3 etapas do formulário (um envio só): o indicador de progresso e os fieldsets usam a mesma lista
export interface RegistrationStep {
  index: string;
  title: string;
  // linha curta do indicador no desktop
  hint: string;
  // id do fieldset da etapa (o link do indicador aponta pra ele)
  id: string;
}

export const REGISTRATION_STEPS: readonly RegistrationStep[] = [
  { index: '01', title: 'Seus dados', hint: 'Nome, e-mail e WhatsApp', id: 'reg-step-01' },
  { index: '02', title: 'Perfil', hint: 'Estudo, curso ou área', id: 'reg-step-02' },
  { index: '03', title: 'Confirmação', hint: 'Aceite e envio', id: 'reg-step-03' },
];

// etapa pronta = nenhum erro de validação nos campos dela (tocados ou não)
export type StepCompletion = readonly [contact: boolean, profile: boolean, confirm: boolean];

export const NO_STEP_DONE: StepCompletion = [false, false, false];

const STEP_OF: Record<string, number> = {
  name: 0,
  email: 0,
  whatsapp: 0,
  adult: 0,
  profile: 1,
  institution: 1,
  course: 1,
  period: 1,
  studentId: 1,
  area: 1,
  acceptedTerms: 2,
};

export const stepOf = (path: string): number | null => STEP_OF[path] ?? null;

export function stepCompletion(errors: RegistrationErrors, fields: RegistrationFields): StepCompletion {
  const steps = stepsWithErrors(errors);
  return [!steps.has(0), fields.profile !== '' && !steps.has(1), fields.acceptedTerms && !steps.has(2)];
}

export interface StepState {
  done: boolean;
  current: boolean;
}

// a etapa atual é a que tem o foco; sem foco no formulário, a primeira que falta (ou a última, tudo pronto)
export function stepStates(done: StepCompletion, focused: number | null): StepState[] {
  const firstTodo = done.findIndex((d) => !d);
  const current = focused ?? (firstTodo === -1 ? done.length - 1 : firstTodo);
  return done.map((d, i) => ({ done: d, current: i === current }));
}

export const doneCount = (done: StepCompletion): number => done.filter(Boolean).length;

// etapas com erro (o indicador acende o número em vermelho): 0 seus dados, 1 perfil, 2 confirmação
export function stepsWithErrors(errors: RegistrationErrors): Set<number> {
  const steps = new Set<number>();
  for (const path of Object.keys(errors)) {
    const step = stepOf(path);
    if (step !== null) steps.add(step);
  }
  return steps;
}

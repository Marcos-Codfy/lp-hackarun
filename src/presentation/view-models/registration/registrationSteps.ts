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
  { index: '01', title: 'Equipe', hint: 'Nome e foto ou logo', id: 'reg-step-01' },
  { index: '02', title: 'Integrantes', hint: 'Nome, matrícula e e-mail', id: 'reg-step-02' },
  { index: '03', title: 'Confirmação', hint: 'Aceite e envio', id: 'reg-step-03' },
];

// etapa pronta = nenhum erro de validação nos campos dela (tocados ou não)
export type StepCompletion = readonly [team: boolean, members: boolean, confirm: boolean];

export const NO_STEP_DONE: StepCompletion = [false, false, false];

const isMemberPath = (path: string) => path === 'members' || path.startsWith('members.');

export function stepCompletion(errors: RegistrationErrors, fields: RegistrationFields): StepCompletion {
  const paths = Object.keys(errors);
  return [
    // foto ainda preparando não tem veredito: só conta pronta com a imagem na mão
    fields.teamImage !== null && !paths.some((p) => p === 'teamName' || p === 'teamImage'),
    !paths.some(isMemberPath),
    fields.acceptedTerms && !paths.includes('acceptedTerms'),
  ];
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

// etapas com erro à vista (o indicador acende o número em vermelho): 0 equipe, 1 integrantes, 2 confirmação
export function stepsWithErrors(errors: RegistrationErrors): Set<number> {
  const steps = new Set<number>();
  for (const path of Object.keys(errors)) {
    if (path === 'teamName' || path === 'teamImage') steps.add(0);
    else if (isMemberPath(path)) steps.add(1);
    else if (path === 'acceptedTerms') steps.add(2);
  }
  return steps;
}

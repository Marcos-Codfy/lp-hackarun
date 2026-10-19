import type { RegistrationDTO } from '@application/index';
import type { IconName } from '@presentation/components/ui/icons';

// regras do regulamento sobre a inscrição individual e o sorteio das equipes (seção de equipes da LP e modelo
// de autorização). Período, data, horário e local saem do regulamento; tamanho das equipes e vagas, do
// event.json (mudou lá, o texto acompanha)
export const TEAM_DRAW = {
  registrationPeriod: '19/10 a 08/11',
  date: '12/11',
  time: '19h15 às 19h35',
  place: 'UniCatólica, Bloco II',
} as const;

export interface DrawStep {
  icon: IconName;
  title: string;
  text: string;
}

type DrawRegistration = Pick<RegistrationDTO, 'teamSize' | 'slots'>;

// "4 pessoas, até 5"; com mínimo igual ao máximo, um número só
export function teamSizeLabel({ min, max }: RegistrationDTO['teamSize']): string {
  return min === max ? `${max} pessoas` : `${min} pessoas, até ${max}`;
}

// as três etapas, na ordem: inscrever, estar no sorteio, formar a equipe
export function teamDrawSteps(registration: DrawRegistration): DrawStep[] {
  const { capacity } = registration.slots;
  const { min, max } = registration.teamSize;
  const spots = capacity ? ` Por enquanto, são ${capacity} vagas.` : '';
  const preferred = min === max ? `${max} pessoas` : `de preferência ${min} pessoas, no máximo ${max}`;
  return [
    {
      icon: 'id-card',
      title: 'Inscrição individual',
      text: `De ${TEAM_DRAW.registrationPeriod}, só pelo site oficial. Cada pessoa faz a própria inscrição.${spots}`,
    },
    {
      icon: 'users',
      title: 'Credenciamento e sorteio',
      text: `Em ${TEAM_DRAW.date}, das ${TEAM_DRAW.time}, na ${TEAM_DRAW.place}. Entra no sorteio só quem estiver presente e credenciado nesse horário.`,
    },
    {
      icon: 'crown',
      title: `Equipes de ${teamSizeLabel(registration.teamSize)}`,
      text: `As equipes têm ${preferred}. Cada equipe escolhe um representante.`,
    },
  ];
}

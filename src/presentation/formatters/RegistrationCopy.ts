import type { RegistrationDTO } from '@application/index';

type Status = RegistrationDTO['status'];

export interface CtaCopy {
  label: string;
  href: string;
  // false = inscrição encerrada, o botão vira só navegação
  isRegistration: boolean;
}

// texto dos CTAs e da linha de status conforme o momento da inscrição
export class RegistrationCopy {
  cta(status: Status): CtaCopy {
    if (status === 'closed') return { label: 'Ver equipes', href: '#equipes', isRegistration: false };
    if (status === 'soon') return { label: 'Quero participar', href: '#inscricao', isRegistration: true };
    return { label: 'Garantir minha vaga', href: '#inscricao', isRegistration: true };
  }

  // versão curta pro header, que não tem espaço
  headerLabel(status: Status): string {
    if (status === 'closed') return 'Equipes';
    if (status === 'soon') return 'Participar';
    return 'Inscrever';
  }

  statusLine(registration: RegistrationDTO): string {
    const { min, max } = registration.teamSize;
    const team = `Equipes de ${min} a ${max} pessoas`;
    switch (registration.status) {
      case 'soon':
        return `Inscrições abrem em breve · ${team}`;
      case 'open':
        return `Inscrições abertas · ${team}`;
      case 'closing':
        return `Últimas horas de inscrição · ${team}`;
      case 'closed':
        return 'Inscrições encerradas · nos vemos na final';
    }
  }

  isUrgent(status: Status): boolean {
    return status === 'closing';
  }
}

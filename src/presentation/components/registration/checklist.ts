// "o que você precisa ter em mãos": a mesma lista no fim da LP (compacta) e no painel da página de inscrição
import type { IconName } from '@presentation/components/ui/icons';

export interface ChecklistItem {
  icon: IconName;
  // a linha do painel da página de inscrição
  title: string;
  // versão curta do fim da LP (cabe em duas linhas no celular)
  short: string;
  // complemento do painel da página de inscrição
  detail: string;
}

export function prepChecklist(teamSize: { min: number; max: number }): ChecklistItem[] {
  const { min, max } = teamSize;
  return [
    {
      icon: 'users',
      title: `${min} a ${max} alunos da UniCatólica`,
      short: `${min} a ${max} alunos da UniCatólica`,
      detail: 'O hackathon é exclusivo para alunos da UniCatólica, em equipes.',
    },
    {
      icon: 'id-card',
      title: 'Nome completo, matrícula e e-mail de cada um',
      short: 'Nome, matrícula e e-mail',
      detail: 'O integrante 1 é o contato da equipe.',
    },
    {
      icon: 'image',
      title: 'Foto ou logo da equipe',
      short: 'Foto ou logo da equipe',
      detail: 'JPG, PNG ou WebP. O tamanho a gente ajusta aqui mesmo.',
    },
    {
      icon: 'mail',
      title: 'E-mail é o canal oficial',
      short: 'E-mail é o canal oficial',
      detail: 'Confirmação e avisos chegam só por e-mail, nunca por WhatsApp.',
    },
  ];
}

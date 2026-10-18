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

// drawAt = "12/11, às 19h15" (lido da programação); sem ele a lista fala só "no dia do sorteio"
export function prepChecklist(
  teamSize: { min: number; max: number },
  drawAt: string | null = null,
): ChecklistItem[] {
  const { min, max } = teamSize;
  return [
    {
      icon: 'id-card',
      title: 'Nome completo, e-mail e WhatsApp',
      short: 'Nome, e-mail e WhatsApp',
      detail: 'É por eles que a organização fala com você.',
    },
    {
      icon: 'cap',
      title: 'Curso e período, se você estuda',
      short: 'Curso e período, se estuda',
      detail: 'Quem estuda na UniCatólica pode informar também a matrícula.',
    },
    {
      icon: 'users',
      title: drawAt ? `Presença no sorteio, em ${drawAt}` : 'Presença no sorteio das equipes',
      short: 'Presença no sorteio',
      detail: `As equipes de ${min} pessoas (até ${max}) são formadas na hora, só com quem estiver presente.`,
    },
    {
      icon: 'shield',
      title: 'Menor de 18 anos: autorização do responsável',
      short: 'Menor de 18: autorização',
      detail: 'Leve a autorização assinada no credenciamento.',
    },
  ];
}

// atalhos no fim de algumas respostas do FAQ (pelo id da pergunta): a página de inscrição (fechada, não tem pra
// onde levar), o regulamento em PDF (só download) e o modelo de autorização de quem tem menos de 18 anos
import type { RegistrationDTO } from '@application/index';
import { REGULATION_PDF, regulationLinkLabel } from '@presentation/components/layout/documents';
import { AUTHORIZATION_PATH } from '@presentation/components/layout/navLinks';
import { registrationHref } from '@presentation/view-models/registration/registrationOrigin';

export interface FaqLink {
  href: string;
  label: string;
  // nome do arquivo de um link que só baixa (o regulamento em PDF)
  download?: string;
}

export function faqLinks(status: RegistrationDTO['status']): Readonly<Record<string, FaqLink>> {
  return {
    ...(status !== 'closed' && {
      signup: { href: registrationHref('faq'), label: 'Ir para a página de inscrição' },
    }),
    rulebook: { href: REGULATION_PDF.href, label: regulationLinkLabel(), download: REGULATION_PDF.fileName },
    minors: { href: AUTHORIZATION_PATH, label: 'Ver o modelo de autorização' },
  };
}

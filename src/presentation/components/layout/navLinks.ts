// âncoras da navegação (header, menu mobile e rodapé usam a mesma lista)
export interface NavLink {
  href: `#${string}`;
  label: string;
}

export const NAV_LINKS: readonly NavLink[] = [
  { href: '#sobre', label: 'Sobre' },
  { href: '#missoes', label: 'Missões' },
  { href: '#programacao', label: 'Programação' },
  { href: '#final', label: 'Final' },
  { href: '#equipes', label: 'Equipes' },
  { href: '#faq', label: 'FAQ' },
];

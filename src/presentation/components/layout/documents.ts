// documentos oficiais em public/: o regulamento só baixa (atributo download + Content-Disposition no
// public/_headers), nunca abre dentro do site. Trocou o PDF? Atualize o tamanho (um teste confere)
export const REGULATION_PDF = {
  href: '/regulamento-hackarun-2026.pdf',
  fileName: 'regulamento-hackarun-2026.pdf',
  size: '196 KB',
  label: 'Baixar o regulamento (PDF)',
} as const;

// rótulo com o tamanho, pra quem baixa saber o peso antes
export const regulationLinkLabel = (): string => `${REGULATION_PDF.label}, ${REGULATION_PDF.size}`;

// avisos do leitor de tela quando a equipe cresce ou diminui (região aria-live do formulário)
const squad = (size: number, max: number) =>
  size >= max ? `Equipe completa: ${size} de ${max}.` : `A equipe tem ${size} de ${max} integrantes.`;

export const addedNotice = (size: number, max: number): string =>
  `Integrante ${size} adicionado. ${squad(size, max)}`;

export const removedNotice = (removed: number, size: number, max: number): string =>
  `Integrante ${removed} removido. ${squad(size, max)}`;

// estado escondido barato pro boot: só escreve opacity inline (sem ler layout nem passar pelo parse
// do gsap). Quem anima tira o véu e cria o tween na mesma tarefa, então nada pisca.
// opacity e não visibility: o conteúdo continua na árvore de acessibilidade
export function veil(els: readonly HTMLElement[]): void {
  for (const el of els) el.style.opacity = '0';
}

export function unveil(els: readonly HTMLElement[]): void {
  for (const el of els) el.style.removeProperty('opacity');
}

// tempos do "show" do sorteio: suspense sem demorar. O resultado já está salvo antes da animação começar; isto é só a
// revelação, e "Revelar tudo" (tecla S) pula para o fim a qualquer momento

// intervalo entre uma equipe e a próxima entrar na tela; com muitas equipes ele encolhe para o total caber em `maxTotalMs`
export function staggerFor(count: number, preferredMs: number, maxTotalMs: number): number {
  if (count <= 1) return 0;
  return Math.min(preferredMs, Math.floor(maxTotalMs / (count - 1)));
}

// atraso de cada item da cascata (o primeiro entra na hora)
export function cascadeDelays(count: number, preferredMs: number, maxTotalMs: number): number[] {
  const step = staggerFor(count, preferredMs, maxTotalMs);
  return Array.from({ length: count }, (_, i) => i * step);
}

export const TEAM_REVEAL = {
  // entre uma equipe e a próxima (46 equipes ≈ 11 s)
  staggerMs: 250,
  maxTotalMs: 11_000,
  // quanto tempo os nomes giram na "roleta" antes de travar
  slotMs: 420,
  slotTickMs: 55,
} as const;

export const NAME_REVEAL = {
  // entre um Pokémon e o próximo no "Sortear todas" (46 equipes ≈ 11 s de cascata)
  staggerMs: 240,
  maxTotalMs: 11_000,
  // duração da passagem silhueta -> cor (bate com o CSS .poke--reveal)
  revealMs: 1100,
} as const;

// cor do brilho do card pelo tipo do Pokémon (o primeiro tipo manda)
const TYPE_COLORS: Record<string, string> = {
  fire: '#ff6b3d',
  water: '#3d8bff',
  grass: '#3ddc84',
  electric: '#ffd23d',
  psychic: '#ff5fa2',
  ice: '#7fe7ff',
  dragon: '#7b5cff',
  dark: '#8a7560',
  fairy: '#ff9de1',
  normal: '#d0d0d8',
  fighting: '#e0574f',
  poison: '#b45cff',
  ground: '#d9a25c',
  flying: '#8ab4ff',
  bug: '#9bd34a',
  rock: '#c2ac74',
  ghost: '#8c7bdc',
  steel: '#a7bbcf',
};

export function typeColor(types: readonly string[]): string {
  return TYPE_COLORS[types[0] ?? ''] ?? '#00e5ff';
}

export const TYPE_LABELS: Record<string, string> = {
  fire: 'Fogo',
  water: 'Água',
  grass: 'Planta',
  electric: 'Elétrico',
  psychic: 'Psíquico',
  ice: 'Gelo',
  dragon: 'Dragão',
  dark: 'Sombrio',
  fairy: 'Fada',
  normal: 'Normal',
  fighting: 'Lutador',
  poison: 'Venenoso',
  ground: 'Terra',
  flying: 'Voador',
  bug: 'Inseto',
  rock: 'Pedra',
  ghost: 'Fantasma',
  steel: 'Aço',
};

export const typeLabel = (type: string): string => TYPE_LABELS[type] ?? type;

export function prefersReducedMotion(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

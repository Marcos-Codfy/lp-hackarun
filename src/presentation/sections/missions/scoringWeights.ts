// pesos da nota da banca no regulamento: cada critério vale uma parte da nota final e a soma é 100.
// O medidor tem um bloco a cada 5%, então todo peso é múltiplo de 5 (o preenchimento nunca fica pela metade)
export interface ScoringWeight {
  label: string;
  weight: number;
}

export const SCORING_WEIGHTS: readonly ScoringWeight[] = [
  { label: 'Funcionalidade', weight: 30 },
  { label: 'Qualidade técnica', weight: 20 },
  { label: 'Inovação e IA', weight: 20 },
  { label: 'Missões e evidências', weight: 20 },
  { label: 'Pitch', weight: 10 },
];

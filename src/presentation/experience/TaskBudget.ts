import { yieldToMain } from './yieldToMain';

const BUDGET_MS = 10;

// passos curtos dividem a mesma tarefa até o orçamento estourar; aí cede a vez. Numa página animada cada
// ida e volta da fila custa um frame inteiro: ceder depois de todo passo atrasava o 3D em segundos no celular
export class TaskBudget {
  private since = performance.now();

  constructor(private readonly budgetMs = BUDGET_MS) {}

  async next(): Promise<void> {
    if (performance.now() - this.since < this.budgetMs) return;
    await yieldToMain();
    this.since = performance.now();
  }
}

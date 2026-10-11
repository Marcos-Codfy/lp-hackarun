type TaskPriority = 'user-blocking' | 'user-visible' | 'background';

interface PostTaskScheduler {
  postTask?: (callback: () => void, options?: { priority?: TaskPriority }) => Promise<void>;
}

// devolve a thread pro navegador (input, paint) antes do próximo passo pesado, numa tarefa de prioridade
// normal. O scheduler.yield herdaria a prioridade de quem chamou, e o 3D nasce de um requestIdleCallback:
// prioridade de fundo, que numa página animada (celular lento) passava mais de 10 s na fila. Sem postTask, setTimeout
export function yieldToMain(): Promise<void> {
  const scheduler = (globalThis as { scheduler?: PostTaskScheduler }).scheduler;
  if (typeof scheduler?.postTask === 'function') {
    return scheduler.postTask(() => undefined, { priority: 'user-visible' });
  }
  return new Promise((resolve) => setTimeout(resolve, 0));
}

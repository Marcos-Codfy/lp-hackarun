type Handler<T> = (payload: T) => void;

// pub/sub tipado pra conversar entre módulos sem acoplamento direto
export class EventBus<TEvents extends Record<string, unknown>> {
  private readonly handlers = new Map<keyof TEvents, Set<Handler<never>>>();

  on<K extends keyof TEvents>(event: K, handler: Handler<TEvents[K]>): () => void {
    const set = this.handlers.get(event) ?? new Set();
    set.add(handler as Handler<never>);
    this.handlers.set(event, set);
    return () => set.delete(handler as Handler<never>);
  }

  once<K extends keyof TEvents>(event: K, handler: Handler<TEvents[K]>): () => void {
    const off = this.on(event, (payload) => {
      off();
      handler(payload);
    });
    return off;
  }

  // handler que quebra não impede os outros de ouvir nem estoura em quem emitiu
  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    this.handlers.get(event)?.forEach((fn) => {
      try {
        (fn as Handler<TEvents[K]>)(payload);
      } catch (error) {
        console.error(`[bus] ${String(event)} handler failed`, error);
      }
    });
  }

  clear(): void {
    this.handlers.clear();
  }
}

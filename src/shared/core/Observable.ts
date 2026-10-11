export type Listener<T> = (value: T, previous: T) => void;

// estado observável do MVVM: a View assina, o ViewModel escreve
export class Observable<T> {
  private current: T;
  private readonly listeners = new Set<Listener<T>>();
  private readonly equals: (a: T, b: T) => boolean;

  constructor(initial: T, equals: (a: T, b: T) => boolean = Object.is) {
    this.current = initial;
    this.equals = equals;
  }

  get value(): T {
    return this.current;
  }

  // listener que quebra não impede os outros nem desfaz a escrita do ViewModel
  set(next: T): void {
    if (this.equals(this.current, next)) return;
    const previous = this.current;
    this.current = next;
    this.listeners.forEach((fn) => {
      try {
        fn(next, previous);
      } catch (error) {
        console.error('[observable] listener failed', error);
      }
    });
  }

  update(fn: (value: T) => T): void {
    this.set(fn(this.current));
  }

  // dispara na hora com o valor atual; retorna o unsubscribe
  subscribe(fn: Listener<T>, { immediate = true } = {}): () => void {
    this.listeners.add(fn);
    if (immediate) fn(this.current, this.current);
    return () => this.listeners.delete(fn);
  }
}

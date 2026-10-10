// base de toda entidade: identidade define igualdade, não os atributos
export abstract class Entity<TId extends string = string> {
  readonly id: TId;

  protected constructor(id: TId) {
    this.id = id;
  }

  equals(other: Entity<TId> | null | undefined): boolean {
    return !!other && other.constructor === this.constructor && other.id === this.id;
  }
}
